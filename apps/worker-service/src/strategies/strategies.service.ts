import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type {
  StrategySignalEvent,
  OrderRequestedEvent,
  NotificationEvent,
} from '@coin/kafka-contracts';
import type { ExchangeId } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService, type RiskConfig } from './risk/risk.service';
import type { ITradingStrategy, StrategySignal } from './strategy.interface';
import { RsiStrategy } from './indicators/rsi.strategy';
import { MacdStrategy } from './indicators/macd.strategy';
import { BollingerStrategy } from './indicators/bollinger.strategy';
import { randomUUID } from 'crypto';

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

@Injectable()
export class StrategiesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StrategiesService.name);
  private kafka: Kafka;
  private producer: Producer;
  private redis: Redis;
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly lastSignals = new Map<string, StrategySignal>();
  private syncTimer: NodeJS.Timeout | null = null;

  private readonly strategyMap = new Map<string, ITradingStrategy>([
    ['rsi', new RsiStrategy()],
    ['macd', new MacdStrategy()],
    ['bollinger', new BollingerStrategy()],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
  ) {
    this.kafka = new Kafka({
      clientId: 'worker-strategies',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Strategies Kafka producer connected');

    await this.syncStrategies();

    // Poll DB every 30s for strategy changes
    this.syncTimer = setInterval(() => this.syncStrategies(), 30_000);
    this.logger.log('Strategy sync started (30s interval)');
  }

  async onModuleDestroy() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    await this.producer.disconnect();
    this.redis.disconnect();
  }

  private async syncStrategies() {
    try {
      const strategies = await this.prisma.strategy.findMany({
        where: { enabled: true },
      });

      const activeIds = new Set(strategies.map((s) => s.id));

      // Stop timers for disabled/deleted strategies
      for (const [id, timer] of this.timers.entries()) {
        if (!activeIds.has(id)) {
          clearInterval(timer);
          this.timers.delete(id);
          this.lastSignals.delete(id);
          this.logger.log(`Stopped strategy: ${id}`);
        }
      }

      // Start timers for new strategies
      for (const strategy of strategies) {
        if (!this.timers.has(strategy.id)) {
          this.startStrategy(strategy as unknown as StrategyRecord);
        }
      }
    } catch (err) {
      this.logger.error(`Strategy sync failed: ${err}`);
    }
  }

  private startStrategy(strategy: StrategyRecord) {
    this.logger.log(
      `Starting strategy: ${strategy.name} (${strategy.type} ${strategy.exchange}:${strategy.symbol}, ${strategy.intervalSeconds}s)`,
    );

    // Run once immediately, then on interval
    this.evaluateStrategy(strategy);

    const timer = setInterval(
      () => this.evaluateStrategy(strategy),
      strategy.intervalSeconds * 1000,
    );
    this.timers.set(strategy.id, timer);
  }

  private async evaluateStrategy(strategy: StrategyRecord) {
    try {
      const impl = this.strategyMap.get(strategy.type);
      if (!impl) {
        this.logger.warn(`Unknown strategy type: ${strategy.type}`);
        return;
      }

      const closePrices = await this.getClosePrices(strategy.exchange, strategy.symbol);
      if (closePrices.length === 0) {
        return;
      }

      const evaluation = impl.evaluate(closePrices, strategy.config);

      // Signal deduplication
      const lastSignal = this.lastSignals.get(strategy.id);
      if (evaluation.signal === lastSignal) {
        return;
      }
      this.lastSignals.set(strategy.id, evaluation.signal);

      if (evaluation.signal === 'hold') {
        return;
      }

      const currentPrice = closePrices[closePrices.length - 1];
      const quantity = (strategy.config.quantity as string) || '0.001';

      // Risk check
      const riskResult = await this.riskService.checkRisk(
        strategy.userId,
        strategy.exchange,
        strategy.symbol,
        evaluation.signal,
        quantity,
        currentPrice,
        strategy.riskConfig,
      );

      if (!riskResult.allowed) {
        await this.createLog(strategy.id, 'risk_blocked', evaluation.signal, {
          ...evaluation.indicatorValues,
          riskReason: riskResult.reason,
          price: currentPrice,
        });

        const riskNotif: NotificationEvent = {
          userId: strategy.userId,
          type: 'risk_blocked',
          title: `리스크 차단 | ${strategy.name}`,
          message: `${evaluation.signal.toUpperCase()} 차단 — ${riskResult.reason}`,
        };
        await this.producer.send({
          topic: KAFKA_TOPICS.NOTIFICATION_SEND,
          messages: [{ key: strategy.userId, value: JSON.stringify(riskNotif) }],
        });

        this.logger.log(
          `Strategy ${strategy.name}: ${evaluation.signal} blocked by risk - ${riskResult.reason}`,
        );
        return;
      }

      if (strategy.mode === 'signal') {
        // Signal-only: publish event + log
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

        await this.producer.send({
          topic: KAFKA_TOPICS.TRADING_STRATEGY_SIGNAL,
          messages: [{ key: strategy.userId, value: JSON.stringify(signalEvent) }],
        });

        await this.createLog(strategy.id, 'signal_generated', evaluation.signal, {
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
        await this.producer.send({
          topic: KAFKA_TOPICS.NOTIFICATION_SEND,
          messages: [{ key: strategy.userId, value: JSON.stringify(signalNotif) }],
        });

        this.logger.log(`Strategy ${strategy.name}: ${evaluation.signal} signal sent`);
      } else {
        // Auto mode: create order via existing pipeline
        const order = await this.prisma.order.create({
          data: {
            userId: strategy.userId,
            exchangeKeyId: strategy.tradingMode === 'real' ? strategy.exchangeKeyId : null,
            exchange: strategy.exchange,
            symbol: strategy.symbol,
            side: evaluation.signal,
            type: 'market',
            mode: strategy.tradingMode,
            status: 'pending',
            quantity,
          },
        });

        const orderEvent: OrderRequestedEvent = {
          requestId: randomUUID(),
          userId: strategy.userId,
          exchangeKeyId: strategy.exchangeKeyId || '',
          order: {
            exchange: strategy.exchange as ExchangeId,
            symbol: strategy.symbol,
            side: evaluation.signal,
            type: 'market',
            quantity,
          },
          mode: strategy.tradingMode as 'paper' | 'real',
          dbOrderId: order.id,
        };

        await this.producer.send({
          topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
          messages: [{ key: strategy.userId, value: JSON.stringify(orderEvent) }],
        });

        await this.createLog(strategy.id, 'order_placed', evaluation.signal, {
          ...evaluation.indicatorValues,
          price: currentPrice,
          reason: evaluation.reason,
          orderId: order.id,
        });

        this.logger.log(
          `Strategy ${strategy.name}: ${evaluation.signal} order placed (${order.id})`,
        );
      }
    } catch (err) {
      this.logger.error(`Strategy ${strategy.id} evaluation failed: ${err}`);
      await this.createLog(strategy.id, 'error', null, {
        error: String(err),
      }).catch(() => {});
    }
  }

  private async getClosePrices(exchange: string, symbol: string): Promise<number[]> {
    const key = `prices:${exchange}:${symbol}`;
    const entries = await this.redis.zrangebyscore(key, '-inf', '+inf');
    return entries.map((entry) => {
      const parts = entry.split(':');
      return parseFloat(parts[parts.length - 1]);
    });
  }

  private async createLog(
    strategyId: string,
    action: string,
    signal: string | null,
    details: Record<string, unknown>,
  ) {
    await this.prisma.strategyLog.create({
      data: {
        strategyId,
        action,
        signal,
        details: details as unknown as Record<string, string | number>,
      },
    });
  }
}
