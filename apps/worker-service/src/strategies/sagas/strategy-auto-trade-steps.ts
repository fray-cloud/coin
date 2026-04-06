import { Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { StrategySignalEvent, OrderRequestedEvent } from '@coin/kafka-contracts';
import type { ExchangeId } from '@coin/types';
import { PrismaService } from '../../prisma/prisma.service';
import type { ITradingStrategy, StrategyEvaluation } from '../strategy.interface';
import type { RiskService, RiskConfig } from '../risk/risk.service';
import { randomUUID } from 'crypto';

interface NotificationEvent {
  userId: string;
  type: string;
  title: string;
  message: string;
}

interface StrategyRecord {
  id: string;
  userId: string;
  name: string;
  type: string;
  exchange: string;
  symbol: string;
  mode: string;
  tradingMode: string;
  exchangeKeyId: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  riskConfig: RiskConfig;
  intervalSeconds: number;
}

export interface AutoTradeContext {
  strategy: StrategyRecord;
  closePrices: number[];
  evaluation?: StrategyEvaluation;
  currentPrice?: number;
  quantity?: string;
  riskAllowed?: boolean;
  riskReason?: string;
  orderId?: string;
}

interface SagaStep {
  readonly name: string;
  execute(context: AutoTradeContext): Promise<AutoTradeContext>;
  compensate(context: AutoTradeContext): Promise<void>;
}

export class EvaluateStep implements SagaStep {
  readonly name = 'Evaluate';
  private readonly logger = new Logger(EvaluateStep.name);

  constructor(private readonly impl: ITradingStrategy) {}

  async execute(context: AutoTradeContext): Promise<AutoTradeContext> {
    const evaluation = this.impl.evaluate(context.closePrices, context.strategy.config);
    const currentPrice = context.closePrices[context.closePrices.length - 1];
    const quantity = (context.strategy.config.quantity as string) || '0.001';

    this.logger.log(`Strategy ${context.strategy.name}: signal=${evaluation.signal}`);
    return { ...context, evaluation, currentPrice, quantity };
  }

  async compensate(_context: AutoTradeContext): Promise<void> {
    // noop — evaluation has no side effects
  }
}

export class RiskCheckStep implements SagaStep {
  readonly name = 'RiskCheck';
  private readonly logger = new Logger(RiskCheckStep.name);

  constructor(private readonly riskService: RiskService) {}

  async execute(context: AutoTradeContext): Promise<AutoTradeContext> {
    const { strategy, evaluation, currentPrice, quantity } = context;
    if (!evaluation || evaluation.signal === 'hold') {
      return { ...context, riskAllowed: false, riskReason: 'hold signal' };
    }

    const riskResult = await this.riskService.checkRisk(
      strategy.userId,
      strategy.exchange,
      strategy.symbol,
      evaluation.signal,
      quantity!,
      currentPrice!,
      strategy.riskConfig,
    );

    this.logger.log(`Risk check for ${strategy.name}: allowed=${riskResult.allowed}`);
    return {
      ...context,
      riskAllowed: riskResult.allowed,
      riskReason: riskResult.reason,
      // Apply volatility/Kelly-adjusted quantity when provided
      quantity: riskResult.adjustedQuantity ?? context.quantity,
    };
  }

  async compensate(_context: AutoTradeContext): Promise<void> {
    // noop
  }
}

export class CreateOrderStep implements SagaStep {
  readonly name = 'CreateOrder';
  private readonly logger = new Logger(CreateOrderStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: AutoTradeContext): Promise<AutoTradeContext> {
    const { strategy, evaluation, quantity } = context;

    const order = await this.prisma.order.create({
      data: {
        userId: strategy.userId,
        exchangeKeyId: strategy.tradingMode === 'real' ? strategy.exchangeKeyId : null,
        exchange: strategy.exchange,
        symbol: strategy.symbol,
        side: evaluation!.signal,
        type: 'market',
        mode: strategy.tradingMode,
        status: 'pending',
        quantity: quantity!,
      },
    });

    this.logger.log(`Strategy order created: ${order.id}`);
    return { ...context, orderId: order.id };
  }

  async compensate(context: AutoTradeContext): Promise<void> {
    if (context.orderId) {
      await this.prisma.order.update({
        where: { id: context.orderId },
        data: { status: 'failed' },
      });
    }
  }
}

export class PublishOrderStep implements SagaStep {
  readonly name = 'PublishOrder';
  private readonly logger = new Logger(PublishOrderStep.name);

  constructor(private readonly producer: Producer) {}

  async execute(context: AutoTradeContext): Promise<AutoTradeContext> {
    const { strategy, evaluation, quantity, orderId } = context;

    const orderEvent: OrderRequestedEvent = {
      requestId: randomUUID(),
      userId: strategy.userId,
      exchangeKeyId: strategy.exchangeKeyId || '',
      order: {
        exchange: strategy.exchange as ExchangeId,
        symbol: strategy.symbol,
        side: evaluation!.signal as 'buy' | 'sell',
        type: 'market',
        quantity: quantity!,
      },
      mode: strategy.tradingMode as 'paper' | 'real',
      dbOrderId: orderId!,
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
      messages: [{ key: strategy.userId, value: JSON.stringify(orderEvent) }],
    });

    this.logger.log(`Strategy order published: ${orderId}`);
    return context;
  }

  async compensate(_context: AutoTradeContext): Promise<void> {
    // noop
  }
}

export async function executeAutoTradeSaga(
  strategy: StrategyRecord,
  closePrices: number[],
  impl: ITradingStrategy,
  riskService: RiskService,
  prisma: PrismaService,
  producer: Producer,
  createLog: (
    strategyId: string,
    action: string,
    signal: string | null,
    details: Record<string, unknown>,
  ) => Promise<void>,
): Promise<void> {
  const logger = new Logger('AutoTradeSaga');

  const steps: SagaStep[] = [new EvaluateStep(impl), new RiskCheckStep(riskService)];

  let context: AutoTradeContext = { strategy, closePrices };
  const completedSteps: SagaStep[] = [];

  // Phase 1: Evaluate + Risk Check
  for (const step of steps) {
    try {
      context = await step.execute(context);
      completedSteps.push(step);
    } catch (err) {
      logger.error(`Step "${step.name}" failed: ${err}`);
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        try {
          await completedSteps[i].compensate(context);
        } catch {}
      }
      throw err;
    }
  }

  const { evaluation, currentPrice, quantity, riskAllowed, riskReason } = context;
  if (!evaluation || evaluation.signal === 'hold') return;

  // Risk blocked
  if (!riskAllowed) {
    await createLog(strategy.id, 'risk_blocked', evaluation.signal, {
      ...evaluation.indicatorValues,
      riskReason,
      price: currentPrice,
    });

    const riskNotif: NotificationEvent = {
      userId: strategy.userId,
      type: 'risk_blocked',
      title: `리스크 차단 | ${strategy.name}`,
      message: `${evaluation.signal.toUpperCase()} 차단 — ${riskReason}`,
    };
    await producer.send({
      topic: KAFKA_TOPICS.NOTIFICATION_SEND,
      messages: [{ key: strategy.userId, value: JSON.stringify(riskNotif) }],
    });
    return;
  }

  // Signal-only mode
  if (strategy.mode === 'signal') {
    const signalEvent: StrategySignalEvent = {
      strategyId: strategy.id,
      userId: strategy.userId,
      exchange: strategy.exchange,
      symbol: strategy.symbol,
      signal: evaluation.signal,
      strategyType: strategy.type,
      indicatorValues: evaluation.indicatorValues,
      reason: evaluation.reason,
      timestamp: Date.now(),
    };

    await producer.send({
      topic: KAFKA_TOPICS.TRADING_STRATEGY_SIGNAL,
      messages: [{ key: strategy.userId, value: JSON.stringify(signalEvent) }],
    });

    await createLog(strategy.id, 'signal_generated', evaluation.signal, {
      ...evaluation.indicatorValues,
      price: currentPrice,
      reason: evaluation.reason,
    });

    const signalNotif: NotificationEvent = {
      userId: strategy.userId,
      type: 'strategy_signal',
      title: `전략 신호 | ${strategy.name}`,
      message: `${evaluation.signal.toUpperCase()} — ${evaluation.reason}`,
    };
    await producer.send({
      topic: KAFKA_TOPICS.NOTIFICATION_SEND,
      messages: [{ key: strategy.userId, value: JSON.stringify(signalNotif) }],
    });
    return;
  }

  // Phase 2: Auto mode — Create Order + Publish (with compensate)
  const autoSteps: SagaStep[] = [new CreateOrderStep(prisma), new PublishOrderStep(producer)];

  for (const step of autoSteps) {
    try {
      context = await step.execute(context);
      completedSteps.push(step);
    } catch (err) {
      logger.error(`Step "${step.name}" failed: ${err}`);
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        try {
          await completedSteps[i].compensate(context);
        } catch {}
      }
      throw err;
    }
  }

  await createLog(strategy.id, 'order_placed', evaluation.signal, {
    ...evaluation.indicatorValues,
    price: currentPrice,
    reason: evaluation.reason,
    orderId: context.orderId,
  });

  logger.log(`Strategy ${strategy.name}: ${evaluation.signal} order placed (${context.orderId})`);
}
