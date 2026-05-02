import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderResultEvent, NotificationEvent } from '@coin/kafka-contracts';
import { BinanceRest, IExchangeRest } from '@coin/exchange-adapters';
import { decrypt } from '@coin/utils';
import type { ExchangeId, ExchangeCredentials, IncomeRecord, PositionSide } from '@coin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { reconcileOrder, type ReconcileDeps, type ReconcileOutcome } from './reconcile-order';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  binance: () => new BinanceRest(),
};

const DEFAULT_INTERVAL_MS = 30_000;
const AUTH_FAIL_THRESHOLD = 3;
const AUTH_COOLDOWN_SEC = 3600;

@Injectable()
export class PositionReconcilerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PositionReconcilerService.name);
  private readonly redis: Redis;
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
    this.kafka = new Kafka({
      clientId: 'worker-position-reconciler',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    const intervalMs = Number(process.env.RECONCILE_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
    this.timer = setInterval(() => {
      void this.runOnce().catch((err) => this.logger.error(`Reconcile tick failed: ${err}`));
    }, intervalMs);
    this.logger.log(`PositionReconciler started (interval=${intervalMs}ms)`);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.producer.disconnect();
    this.redis.disconnect();
  }

  /**
   * One reconcile pass over all open real-mode orders. Public so it can be
   * driven from tests with deterministic timing.
   */
  async runOnce(): Promise<ReconcileOutcome[]> {
    if (this.running) {
      this.logger.debug('Skip overlapping reconcile tick');
      return [];
    }
    this.running = true;
    try {
      const orders = await this.prisma.order.findMany({
        where: { mode: 'real', status: 'filled', closedAt: null },
        include: { exchangeKey: true },
        orderBy: { createdAt: 'asc' },
      });
      if (orders.length === 0) return [];

      const masterKey = process.env.ENCRYPTION_MASTER_KEY;
      if (!masterKey) throw new Error('ENCRYPTION_MASTER_KEY not configured');

      const outcomes: ReconcileOutcome[] = [];
      for (const order of orders) {
        if (!order.exchangeKeyId || !order.exchangeKey) continue;

        const cooldownKey = `reconcile:auth-cooldown:${order.exchangeKeyId}`;
        if (await this.redis.get(cooldownKey)) continue;

        const credentials: ExchangeCredentials = {
          apiKey: decrypt(order.exchangeKey.apiKey, masterKey),
          secretKey: decrypt(order.exchangeKey.secretKey, masterKey),
          network: (order.exchangeKey.network as 'mainnet' | 'testnet') ?? 'mainnet',
        };

        const adapter = REST_ADAPTERS[order.exchange as ExchangeId]();
        const deps: ReconcileDeps = {
          prisma: this.prisma,
          redis: this.redis,
          getPosition: (s) => adapter.getPosition(credentials, s),
          getIncome: (opts) => adapter.getIncome(credentials, opts),
          emit: (events) => this.emit(events, order.userId),
        };

        try {
          const outcome = await reconcileOrder(order, deps);
          outcomes.push(outcome);
          if (outcome.action === 'closed') {
            this.logger.log(
              `Reconciled ${order.id}: ${outcome.reason} realizedPnl=${outcome.realizedPnl ?? 'null'}`,
            );
          }
        } catch (err) {
          if (this.isAuthError(err)) {
            await this.bumpAuthFailure(order.exchangeKeyId);
          }
          this.logger.warn(`Reconcile failed for ${order.id}: ${err}`);
        }
      }
      return outcomes;
    } finally {
      this.running = false;
    }
  }

  private async emit(
    events: { result?: OrderResultEvent; notification?: NotificationEvent }[],
    _userId: string,
  ) {
    for (const e of events) {
      if (e.result) {
        await this.producer.send({
          topic: KAFKA_TOPICS.TRADING_ORDER_RESULT,
          messages: [{ key: e.result.userId, value: JSON.stringify(e.result) }],
        });
      }
      if (e.notification) {
        await this.producer.send({
          topic: KAFKA_TOPICS.NOTIFICATION_SEND,
          messages: [{ key: e.notification.userId, value: JSON.stringify(e.notification) }],
        });
      }
    }
  }

  private isAuthError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    return /-2014|-2015|-1022|API-key|Invalid signature/i.test(err.message);
  }

  private async bumpAuthFailure(exchangeKeyId: string) {
    const counterKey = `reconcile:auth-fail:${exchangeKeyId}`;
    const count = await this.redis.incr(counterKey);
    await this.redis.expire(counterKey, AUTH_COOLDOWN_SEC);
    if (count >= AUTH_FAIL_THRESHOLD) {
      const cooldownKey = `reconcile:auth-cooldown:${exchangeKeyId}`;
      await this.redis.set(cooldownKey, '1', 'EX', AUTH_COOLDOWN_SEC);
      this.logger.warn(
        `Exchange key ${exchangeKeyId} put in 1h auth cooldown after ${count} failures`,
      );
    }
  }
}

// Export type aliases for tests
export type { IncomeRecord, PositionSide };
