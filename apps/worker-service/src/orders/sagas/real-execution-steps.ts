import { Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderResultEvent, OrderRequestedEvent } from '@coin/kafka-contracts';
import type { ExchangeId, ExchangeCredentials, OrderResult, MarginType } from '@coin/types';
import { BinanceRest, IExchangeRest } from '@coin/exchange-adapters';
import { decrypt } from '@coin/utils';
import { PrismaService } from '../../prisma/prisma.service';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  binance: () => new BinanceRest(),
};

export interface RealExecutionContext {
  event: OrderRequestedEvent;
  credentials?: ExchangeCredentials;
  result?: OrderResult;
  tpOrderId?: string;
  slOrderId?: string;
}

interface SagaStep {
  readonly name: string;
  execute(context: RealExecutionContext): Promise<RealExecutionContext>;
  compensate(context: RealExecutionContext): Promise<void>;
}

export class DecryptKeysStep implements SagaStep {
  readonly name = 'DecryptKeys';
  private readonly logger = new Logger(DecryptKeysStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: RealExecutionContext): Promise<RealExecutionContext> {
    const { event } = context;
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKey) throw new Error('ENCRYPTION_MASTER_KEY not configured');

    const exchangeKey = await this.prisma.exchangeKey.findFirst({
      where: { id: event.exchangeKeyId, userId: event.userId },
    });
    if (!exchangeKey) throw new Error(`Exchange key not found: ${event.exchangeKeyId}`);

    const credentials: ExchangeCredentials = {
      apiKey: decrypt(exchangeKey.apiKey, masterKey),
      secretKey: decrypt(exchangeKey.secretKey, masterKey),
      network: (exchangeKey.network as 'mainnet' | 'testnet') ?? 'mainnet',
    };

    this.logger.log(`Keys decrypted for ${event.order.exchange} (${credentials.network})`);
    return { ...context, credentials };
  }

  async compensate(_context: RealExecutionContext): Promise<void> {
    // noop
  }
}

/**
 * Configures Binance Futures account state idempotently:
 * - one-way position mode (dualSidePosition=false)
 * - margin type per order (default ISOLATED)
 * - leverage per order
 *
 * All three calls swallow Binance's "no need to change" errors so a re-run
 * with identical settings is a no-op.
 */
export class ConfigureFuturesAccountStep implements SagaStep {
  readonly name = 'ConfigureFuturesAccount';
  private readonly logger = new Logger(ConfigureFuturesAccountStep.name);

  async execute(context: RealExecutionContext): Promise<RealExecutionContext> {
    const { event, credentials } = context;
    if (!credentials) throw new Error('No credentials available');

    const adapter = REST_ADAPTERS[event.order.exchange]();
    const symbol = event.order.symbol;
    const marginType: MarginType = event.order.marginType ?? 'ISOLATED';
    const leverage = event.order.leverage ?? 1;

    await adapter.setPositionMode(credentials, false);
    await adapter.setMarginType(credentials, symbol, marginType);
    await adapter.setLeverage(credentials, symbol, leverage);
    this.logger.log(`Configured ${symbol}: marginType=${marginType} leverage=${leverage}x`);
    return context;
  }

  async compensate(_context: RealExecutionContext): Promise<void> {
    // noop — settings are stateful but harmless to leave
  }
}

export class PlaceOrderStep implements SagaStep {
  readonly name = 'PlaceOrder';
  private readonly logger = new Logger(PlaceOrderStep.name);
  private readonly maxRetries = 2;

  async execute(context: RealExecutionContext): Promise<RealExecutionContext> {
    const { event, credentials } = context;
    if (!credentials) throw new Error('No credentials available');

    const order = event.order;
    const adapter = REST_ADAPTERS[event.order.exchange]();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        let result = await adapter.placeOrder(credentials, order);
        this.logger.log(
          `Order placed on ${event.order.exchange}: ${result.orderId} (${result.status})`,
        );

        if (order.type === 'market' && result.status === 'placed' && result.orderId) {
          for (let poll = 0; poll < 5; poll++) {
            await new Promise((r) => setTimeout(r, 1000));
            try {
              const updated = await adapter.getOrder(credentials, result.orderId, order.symbol);
              this.logger.log(
                `Poll ${poll + 1}: ${updated.status} (filled qty: ${updated.filledQuantity})`,
              );
              if (
                updated.status === 'filled' ||
                updated.status === 'partial' ||
                updated.status === 'cancelled'
              ) {
                result = updated;
                break;
              }
            } catch {
              // ignore poll errors
            }
          }
        }

        return { ...context, result };
      } catch (err) {
        lastError = err as Error;
        if (attempt < this.maxRetries) {
          this.logger.warn(`PlaceOrder attempt ${attempt + 1} failed, retrying: ${err}`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('PlaceOrder failed after retries');
  }

  async compensate(_context: RealExecutionContext): Promise<void> {
    // noop
  }
}

/**
 * Attaches conditional close orders (TAKE_PROFIT_MARKET / STOP_MARKET) via
 * Binance's algoOrder endpoint after the entry has filled. If either
 * placement fails, force-close the underlying position so it never sits
 * naked.
 */
export class AttachTpSlStep implements SagaStep {
  readonly name = 'AttachTpSl';
  private readonly logger = new Logger(AttachTpSlStep.name);

  async execute(context: RealExecutionContext): Promise<RealExecutionContext> {
    const { event, credentials, result } = context;
    if (!credentials) throw new Error('No credentials available');
    if (!result) throw new Error('No entry order result available');

    const order = event.order;
    if (!order.takeProfitPrice && !order.stopLossPrice) {
      this.logger.log('No TP/SL specified, skipping');
      return context;
    }

    const adapter = REST_ADAPTERS[order.exchange]();
    const filledQty = result.filledQuantity || order.quantity;

    let tpOrderId: string | undefined;
    let slOrderId: string | undefined;
    try {
      if (order.takeProfitPrice) {
        const tp = await adapter.placeTakeProfit(
          credentials,
          order.symbol,
          order.side,
          order.takeProfitPrice,
          filledQty,
        );
        tpOrderId = tp.orderId;
        this.logger.log(`TP attached: algoId=${tp.orderId} @ ${order.takeProfitPrice}`);
      }
      if (order.stopLossPrice) {
        const sl = await adapter.placeStopLoss(
          credentials,
          order.symbol,
          order.side,
          order.stopLossPrice,
          filledQty,
        );
        slOrderId = sl.orderId;
        this.logger.log(`SL attached: algoId=${sl.orderId} @ ${order.stopLossPrice}`);
      }
      return { ...context, tpOrderId, slOrderId };
    } catch (err) {
      this.logger.error(`TP/SL attach failed, force-closing position: ${err}`);
      try {
        await adapter.closePosition(credentials, order.symbol, order.side, filledQty);
        this.logger.warn('Position force-closed after TP/SL failure');
      } catch (closeErr) {
        this.logger.error(`Force-close also failed: ${closeErr}`);
      }
      throw err;
    }
  }

  async compensate(_context: RealExecutionContext): Promise<void> {
    // already handled inline
  }
}

export class UpdateDbStep implements SagaStep {
  readonly name = 'UpdateDb';
  private readonly logger = new Logger(UpdateDbStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: RealExecutionContext): Promise<RealExecutionContext> {
    const { event, result, tpOrderId, slOrderId } = context;
    if (!result) throw new Error('No order result available');

    await this.prisma.order.update({
      where: { id: event.dbOrderId },
      data: {
        status: result.status,
        exchangeOrderId: result.orderId,
        filledQuantity: result.filledQuantity,
        filledPrice: result.filledPrice,
        fee: result.fee,
        feeCurrency: result.feeCurrency,
        leverage: event.order.leverage,
        marginType: event.order.marginType ?? 'ISOLATED',
        positionSide: event.order.side,
        entryPrice: result.filledPrice,
        takeProfitPrice: event.order.takeProfitPrice,
        stopLossPrice: event.order.stopLossPrice,
        tpOrderId,
        slOrderId,
      },
    });

    this.logger.log(`DB updated for order ${event.dbOrderId}: ${result.status}`);
    return context;
  }

  async compensate(context: RealExecutionContext): Promise<void> {
    if (context.event.dbOrderId) {
      await this.prisma.order.update({
        where: { id: context.event.dbOrderId },
        data: { status: 'failed' },
      });
    }
  }
}

export class PublishResultStep implements SagaStep {
  readonly name = 'PublishResult';
  private readonly logger = new Logger(PublishResultStep.name);

  constructor(private readonly producer: Producer) {}

  async execute(context: RealExecutionContext): Promise<RealExecutionContext> {
    const { event, result, tpOrderId, slOrderId } = context;
    if (!result) throw new Error('No order result available');

    const resultEvent: OrderResultEvent = {
      requestId: event.requestId,
      userId: event.userId,
      dbOrderId: event.dbOrderId,
      result: { ...result, tpOrderId, slOrderId },
      mode: 'real',
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_RESULT,
      messages: [{ key: event.userId, value: JSON.stringify(resultEvent) }],
    });

    this.logger.log(`Result published for order ${event.dbOrderId}`);
    return context;
  }

  async compensate(_context: RealExecutionContext): Promise<void> {
    // noop
  }
}

export async function executeRealOrderSaga(
  event: OrderRequestedEvent,
  prisma: PrismaService,
  producer: Producer,
  _redis?: Redis,
): Promise<void> {
  const logger = new Logger('RealExecutionSaga');
  const steps: SagaStep[] = [
    new DecryptKeysStep(prisma),
    new ConfigureFuturesAccountStep(),
    new PlaceOrderStep(),
    new AttachTpSlStep(),
    new UpdateDbStep(prisma),
    new PublishResultStep(producer),
  ];

  let context: RealExecutionContext = { event };
  const completedSteps: SagaStep[] = [];

  for (const step of steps) {
    try {
      context = await step.execute(context);
      completedSteps.push(step);
    } catch (err) {
      logger.error(`Step "${step.name}" failed: ${err}`);
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        try {
          await completedSteps[i].compensate(context);
        } catch (compErr) {
          logger.error(`Compensation "${completedSteps[i].name}" failed: ${compErr}`);
        }
      }
      throw err;
    }
  }
}
