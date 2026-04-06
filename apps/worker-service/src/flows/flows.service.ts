import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderRequestedEvent } from '@coin/kafka-contracts';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId, Candle, FlowDefinition, FlowOrderAction } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService, type RiskConfig } from '../strategies/risk/risk.service';
import { FlowCompiler, FlowExecutionContext, type CompiledFlow } from './flow-compiler';

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

/** Evaluation interval (ms) derived from candle interval */
const CANDLE_INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
};

interface FlowRecord {
  id: string;
  userId: string;
  name: string;
  definition: FlowDefinition;
  exchange: string;
  symbol: string;
  candleInterval: string;
  enabled: boolean;
  tradingMode: string;
  exchangeKeyId: string | null;
  riskConfig: RiskConfig | null;
}

@Injectable()
export class FlowsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FlowsService.name);
  private kafka: Kafka;
  private producer: Producer;
  private redis: Redis;
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly compiledFlows = new Map<string, CompiledFlow>();
  private readonly executionContexts = new Map<string, FlowExecutionContext>();
  /** Last action side per flow to deduplicate consecutive same-side orders */
  private readonly lastActions = new Map<string, 'buy' | 'sell'>();
  private syncTimer: NodeJS.Timeout | null = null;
  private readonly compiler = new FlowCompiler();

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskService: RiskService,
  ) {
    this.kafka = new Kafka({
      clientId: 'worker-flows',
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
    this.logger.log('Flows Kafka producer connected');
    await this.syncFlows();
    this.syncTimer = setInterval(() => this.syncFlows(), 30_000);
  }

  async onModuleDestroy() {
    if (this.syncTimer) clearInterval(this.syncTimer);
    for (const timer of this.timers.values()) clearInterval(timer);
    await this.producer.disconnect();
    this.redis.disconnect();
  }

  private async syncFlows() {
    try {
      const flows = await this.prisma.flow.findMany({
        where: { enabled: true },
      });

      const activeIds = new Set(flows.map((f) => f.id));

      // Stop flows that were disabled or deleted
      for (const id of this.timers.keys()) {
        if (!activeIds.has(id)) {
          clearInterval(this.timers.get(id));
          this.timers.delete(id);
          this.compiledFlows.delete(id);
          this.executionContexts.delete(id);
          this.lastActions.delete(id);
          this.logger.log(`Stopped flow ${id}`);
        }
      }

      // Start or refresh flows
      for (const flow of flows) {
        const record = flow as unknown as FlowRecord;
        if (!this.timers.has(record.id)) {
          this.startFlow(record);
        }
      }
    } catch (err) {
      this.logger.error(`Flow sync failed: ${err}`);
    }
  }

  private startFlow(flow: FlowRecord) {
    try {
      const compiled = this.compiler.compile(flow.definition);
      this.compiledFlows.set(flow.id, compiled);
      this.executionContexts.set(flow.id, { nodeStates: {} });

      const intervalMs = CANDLE_INTERVAL_MS[flow.candleInterval] ?? 3_600_000;

      // Evaluate immediately, then on interval
      void this.evaluateFlow(flow);
      const timer = setInterval(() => void this.evaluateFlow(flow), intervalMs);
      this.timers.set(flow.id, timer);

      this.logger.log(`Started flow "${flow.name}" (${flow.id}) — interval ${flow.candleInterval}`);
    } catch (err) {
      this.logger.warn(`Flow ${flow.id} compilation failed: ${err}`);
    }
  }

  private async evaluateFlow(flow: FlowRecord) {
    const compiled = this.compiledFlows.get(flow.id);
    const context = this.executionContexts.get(flow.id);
    if (!compiled || !context) return;

    try {
      const candles = await this.getCandles(flow.exchange, flow.symbol, flow.candleInterval);
      if (candles.length === 0) return;

      const currentPrice = parseFloat(candles[candles.length - 1].close);
      const { actions } = compiled.execute(candles, context);

      for (const action of actions) {
        await this.processAction(flow, action, currentPrice);
      }
    } catch (err) {
      this.logger.error(`Flow ${flow.id} evaluation error: ${err}`);
    }
  }

  private async processAction(flow: FlowRecord, action: FlowOrderAction, currentPrice: number) {
    // Deduplicate: skip if same side as last action
    const lastSide = this.lastActions.get(flow.id);
    if (action.side === lastSide) return;

    // Risk check (if riskConfig is set)
    if (flow.riskConfig) {
      const riskResult = await this.riskService.checkRisk(
        flow.userId,
        flow.exchange,
        flow.symbol,
        action.side as 'buy' | 'sell',
        action.amount,
        currentPrice,
        flow.riskConfig,
      );
      if (!riskResult.allowed) {
        this.logger.warn(`Flow ${flow.id} action blocked by risk: ${riskResult.reason}`);
        return;
      }
    }

    // Create order record in DB
    const order = await this.prisma.order.create({
      data: {
        userId: flow.userId,
        exchangeKeyId: flow.tradingMode === 'real' ? flow.exchangeKeyId : null,
        exchange: flow.exchange,
        symbol: flow.symbol,
        side: action.side,
        type: action.type || 'market',
        mode: flow.tradingMode,
        status: 'pending',
        quantity: action.amount,
      },
    });

    // Publish to Orders pipeline
    const event: OrderRequestedEvent = {
      requestId: randomUUID(),
      userId: flow.userId,
      exchangeKeyId: flow.exchangeKeyId || '',
      order: {
        exchange: flow.exchange as ExchangeId,
        symbol: flow.symbol,
        side: action.side,
        type: action.type || 'market',
        quantity: action.amount,
        price: action.price,
      },
      mode: flow.tradingMode as 'paper' | 'real',
      dbOrderId: order.id,
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
      messages: [{ key: flow.id, value: JSON.stringify(event) }],
    });

    this.lastActions.set(flow.id, action.side);
    this.logger.log(
      `Flow "${flow.name}" placed ${action.side} order ${order.id} (${action.amount} ${flow.symbol})`,
    );
  }

  private async getCandles(exchange: string, symbol: string, interval: string): Promise<Candle[]> {
    const cacheKey = `candles:${exchange}:${symbol}:${interval}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Candle[];
    }

    const adapterFactory = REST_ADAPTERS[exchange as ExchangeId];
    if (!adapterFactory) return [];

    try {
      const adapter = adapterFactory();
      const candles = await adapter.getCandles(symbol, interval, 200);
      const ttl = CANDLE_CACHE_TTL[interval] || 600;
      await this.redis.set(cacheKey, JSON.stringify(candles), 'EX', ttl);
      return candles;
    } catch (err) {
      this.logger.warn(`Failed to fetch candles for ${exchange}:${symbol}:${interval}: ${err}`);
      return [];
    }
  }
}
