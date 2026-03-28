import { Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderResultEvent, OrderRequestedEvent } from '@coin/kafka-contracts';
import type { ExchangeId, ExchangeCredentials, OrderResult } from '@coin/types';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import { decrypt } from '@coin/utils';
import { PrismaService } from '../../prisma/prisma.service';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

export interface RealExecutionContext {
  event: OrderRequestedEvent;
  credentials?: ExchangeCredentials;
  result?: OrderResult;
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
    };

    this.logger.log(`Keys decrypted for ${event.order.exchange}`);
    return { ...context, credentials };
  }

  async compensate(_context: RealExecutionContext): Promise<void> {
    // noop — nothing to undo for decryption
  }
}

export class PlaceOrderStep implements SagaStep {
  readonly name = 'PlaceOrder';
  private readonly logger = new Logger(PlaceOrderStep.name);
  private readonly maxRetries = 2;
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async execute(context: RealExecutionContext): Promise<RealExecutionContext> {
    const { event, credentials } = context;
    if (!credentials) throw new Error('No credentials available');

    const order = { ...event.order };

    // Upbit market buy requires KRW amount, not coin quantity.
    // Convert quantity (coin units) to KRW using current price.
    if (order.exchange === 'upbit' && order.type === 'market' && order.side === 'buy') {
      const tickerKey = `ticker:upbit:${order.symbol}`;
      const tickerData = await this.redis.get(tickerKey);
      if (tickerData) {
        const currentPrice = parseFloat(JSON.parse(tickerData).price);
        const krwAmount = Math.floor(parseFloat(order.quantity) * currentPrice);
        this.logger.log(`Upbit market buy: ${order.quantity} × ${currentPrice} = ${krwAmount} KRW`);
        order.price = String(krwAmount);
      } else {
        throw new Error(`No ticker data for ${order.symbol} — cannot calculate KRW amount`);
      }
    }

    const adapter = REST_ADAPTERS[event.order.exchange]();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        let result = await adapter.placeOrder(credentials, order);
        this.logger.log(
          `Order placed on ${event.order.exchange}: ${result.orderId} (${result.status})`,
        );

        // For market orders, poll until filled (exchanges process async)
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
                // Upbit market buy returns 'cancelled' when done (remaining KRW refunded)
                // but the adapter maps cancel+executed_volume>0 to 'filled'
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
    // noop — exchange order cannot be easily cancelled at this stage
  }
}

export class UpdateDbStep implements SagaStep {
  readonly name = 'UpdateDb';
  private readonly logger = new Logger(UpdateDbStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: RealExecutionContext): Promise<RealExecutionContext> {
    const { event, result } = context;
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
    const { event, result } = context;
    if (!result) throw new Error('No order result available');

    const resultEvent: OrderResultEvent = {
      requestId: event.requestId,
      userId: event.userId,
      dbOrderId: event.dbOrderId,
      result,
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
    // noop — result message already sent
  }
}

export async function executeRealOrderSaga(
  event: OrderRequestedEvent,
  prisma: PrismaService,
  producer: Producer,
  redis?: Redis,
): Promise<void> {
  const logger = new Logger('RealExecutionSaga');
  const redisInstance =
    redis ||
    new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  const steps: SagaStep[] = [
    new DecryptKeysStep(prisma),
    new PlaceOrderStep(redisInstance),
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

      // Compensate in reverse order
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
