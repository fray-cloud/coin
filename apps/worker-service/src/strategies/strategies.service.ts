import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService, type RiskConfig } from './risk/risk.service';
import type { ITradingStrategy, StrategySignal } from './strategy.interface';
import { RsiStrategy } from './indicators/rsi.strategy';
import { MacdStrategy } from './indicators/macd.strategy';
import { BollingerStrategy } from './indicators/bollinger.strategy';
import { executeAutoTradeSaga } from './sagas/strategy-auto-trade-steps';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId } from '@coin/types';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

const CANDLE_CACHE_TTL: Record<string, number> = {
  '1m': 30,
  '5m': 120,
  '15m': 300,
  '1h': 600,
  '4h': 1800,
  '1d': 3600,
};

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
  candleInterval: string;
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

      const closePrices = await this.getCandleClosePrices(
        strategy.exchange,
        strategy.symbol,
        strategy.candleInterval || '1h',
      );
      if (closePrices.length === 0) {
        return;
      }

      // Signal deduplication (before saga to avoid unnecessary work)
      const evaluation = impl.evaluate(closePrices, strategy.config);
      const lastSignal = this.lastSignals.get(strategy.id);
      if (evaluation.signal === lastSignal) {
        return;
      }
      this.lastSignals.set(strategy.id, evaluation.signal);

      if (evaluation.signal === 'hold') {
        return;
      }

      await executeAutoTradeSaga(
        strategy,
        closePrices,
        impl,
        this.riskService,
        this.prisma,
        this.producer,
        (strategyId, action, signal, details) =>
          this.createLog(strategyId, action, signal, details),
      );
    } catch (err) {
      this.logger.error(`Strategy ${strategy.id} evaluation failed: ${err}`);
      await this.createLog(strategy.id, 'error', null, {
        error: String(err),
      }).catch(() => {});
    }
  }

  private async getCandleClosePrices(
    exchange: string,
    symbol: string,
    interval: string,
  ): Promise<number[]> {
    const cacheKey = `candles:${exchange}:${symbol}:${interval}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      const candles = JSON.parse(cached) as Array<{ close: string }>;
      return candles.map((c) => parseFloat(c.close));
    }

    // Cache miss — fetch from exchange API
    const adapterFactory = REST_ADAPTERS[exchange as ExchangeId];
    if (!adapterFactory) return [];

    try {
      const adapter = adapterFactory();
      const candles = await adapter.getCandles(symbol, interval, 200);
      const ttl = CANDLE_CACHE_TTL[interval] || 600;
      await this.redis.set(cacheKey, JSON.stringify(candles), 'EX', ttl);
      return candles.map((c) => parseFloat(c.close));
    } catch (err) {
      this.logger.warn(`Failed to fetch candles for ${exchange}:${symbol}:${interval}: ${err}`);
      return [];
    }
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
