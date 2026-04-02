import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Consumer, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { BacktestRequestedEvent, BacktestCompletedEvent } from '@coin/kafka-contracts';
import type { FlowDefinition, Candle, ExchangeId, BacktestSummary } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';
import { FlowCompiler, FlowExecutionContext } from '../flows/flow-compiler';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

const CANDLE_CACHE_TTL = 3600; // 1h for backtest candle cache

@Injectable()
export class BacktestsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BacktestsService.name);
  private readonly compiler = new FlowCompiler();

  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.kafka = new Kafka({
      clientId: 'worker-backtests',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.consumer = this.kafka.consumer({ groupId: 'worker-backtests-group' });
    this.producer = this.kafka.producer();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: KAFKA_TOPICS.FLOW_BACKTEST_REQUESTED,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const event: BacktestRequestedEvent = JSON.parse(message.value.toString());
        await this.handleBacktestRequested(event);
      },
    });

    this.logger.log('Backtests Kafka consumer started');
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    await this.producer.disconnect();
    this.redis.disconnect();
  }

  private async handleBacktestRequested(event: BacktestRequestedEvent) {
    const { backtestId, flowId, userId, startDate, endDate } = event;

    // Idempotency check
    const lockKey = `backtest:lock:${backtestId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 300, 'NX');
    if (!acquired) return;

    this.logger.log(`Starting backtest ${backtestId} for flow ${flowId}`);

    try {
      // Update status to running
      await this.prisma.backtest.update({
        where: { id: backtestId },
        data: { status: 'running' },
      });

      // Fetch flow definition
      const flow = await this.prisma.flow.findUnique({
        where: { id: flowId },
      });
      if (!flow) throw new Error(`Flow ${flowId} not found`);

      const definition = flow.definition as unknown as FlowDefinition;

      // Compile the flow
      const compiled = this.compiler.compile(definition);

      // Fetch historical candles
      const candles = await this.fetchHistoricalCandles(
        flow.exchange as ExchangeId,
        flow.symbol,
        flow.candleInterval,
        new Date(startDate),
        new Date(endDate),
      );

      if (candles.length === 0) {
        throw new Error('No candle data available for the specified date range');
      }

      this.logger.log(
        `Fetched ${candles.length} candles for ${flow.exchange}:${flow.symbol}:${flow.candleInterval}`,
      );

      // Execute flow for each candle (sliding window)
      const context: FlowExecutionContext = { nodeStates: {} };
      const allTraces: Array<{
        timestamp: Date;
        nodeId: string;
        input: object;
        output: object;
        fired: boolean;
        durationMs: number;
      }> = [];
      const allActions: Array<{
        side: 'buy' | 'sell';
        amount: string;
        timestamp: Date;
      }> = [];

      // We need enough candles for indicators to warm up.
      // Walk through candles one at a time, passing the full history up to that point
      for (let i = 0; i < candles.length; i++) {
        const candleWindow = candles.slice(0, i + 1);
        const result = compiled.execute(candleWindow, context);

        for (const trace of result.traces) {
          allTraces.push({
            timestamp: new Date(candles[i].timestamp),
            nodeId: trace.nodeId,
            input: trace.input as object,
            output: trace.output as object,
            fired: trace.fired,
            durationMs: trace.durationMs,
          });
        }

        for (const action of result.actions) {
          allActions.push({
            side: action.side,
            amount: action.amount,
            timestamp: new Date(candles[i].timestamp),
          });
        }
      }

      // Batch insert traces (chunks of 500)
      const CHUNK_SIZE = 500;
      for (let i = 0; i < allTraces.length; i += CHUNK_SIZE) {
        const chunk = allTraces.slice(i, i + CHUNK_SIZE);
        await this.prisma.backtestTrace.createMany({
          data: chunk.map((t) => ({
            backtestId,
            timestamp: t.timestamp,
            nodeId: t.nodeId,
            input: t.input as never,
            output: t.output as never,
            fired: t.fired,
            durationMs: t.durationMs,
          })),
        });
      }

      // Calculate summary
      const summary = this.calculateSummary(candles, allActions);

      // Update backtest with results
      await this.prisma.backtest.update({
        where: { id: backtestId },
        data: {
          status: 'completed',
          summary: summary as never,
        },
      });

      // Publish completion event
      await this.publishCompleted({
        backtestId,
        flowId,
        userId,
        status: 'completed',
      });

      this.logger.log(
        `Backtest ${backtestId} completed: ${allActions.length} signals, ${allTraces.length} trace entries`,
      );
    } catch (err: any) {
      this.logger.error(`Backtest ${backtestId} failed: ${err.message}`);

      await this.prisma.backtest
        .update({
          where: { id: backtestId },
          data: { status: 'failed', summary: { error: err.message } as never },
        })
        .catch(() => {});

      await this.publishCompleted({
        backtestId,
        flowId,
        userId,
        status: 'failed',
        error: err.message,
      });
    }
  }

  /**
   * Fetch historical candles for the given date range using paginated exchange API calls.
   */
  private async fetchHistoricalCandles(
    exchange: ExchangeId,
    symbol: string,
    interval: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Candle[]> {
    symbol = symbol.toUpperCase().replace(/\//g, '');
    const cacheKey = `backtest:candles:${exchange}:${symbol}:${interval}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as Candle[];
    }

    const adapterFactory = REST_ADAPTERS[exchange];
    if (!adapterFactory) throw new Error(`Unsupported exchange: ${exchange}`);

    const adapter = adapterFactory();
    const candles = await adapter.getCandlesByRange(
      symbol,
      interval,
      startDate.getTime(),
      endDate.getTime(),
    );

    if (candles.length > 0) {
      await this.redis.set(cacheKey, JSON.stringify(candles), 'EX', CANDLE_CACHE_TTL);
    }

    return candles;
  }

  /**
   * Calculate backtest summary from actions.
   * Simple P&L model: pair buy→sell as a round trip trade.
   */
  private calculateSummary(
    candles: Candle[],
    actions: Array<{ side: 'buy' | 'sell'; amount: string; timestamp: Date }>,
  ): BacktestSummary {
    const buySignals = actions.filter((a) => a.side === 'buy').length;
    const sellSignals = actions.filter((a) => a.side === 'sell').length;

    // Build price lookup from candles
    const priceByTime = new Map<number, number>();
    for (const c of candles) {
      priceByTime.set(c.timestamp, parseFloat(c.close));
    }

    // Pair trades: buy then sell = 1 round trip
    let totalTrades = 0;
    let wins = 0;
    let realizedPnl = 0;
    let openPosition: { price: number; amount: number; timestamp: Date } | null = null;

    const dailyPnlMap = new Map<string, number>();

    for (const action of actions) {
      const price =
        priceByTime.get(action.timestamp.getTime()) ||
        parseFloat(candles[candles.length - 1]?.close || '0');
      const amount = parseFloat(action.amount) || 0.001;

      if (action.side === 'buy' && !openPosition) {
        openPosition = { price, amount, timestamp: action.timestamp };
      } else if (action.side === 'sell' && openPosition) {
        const pnl = (price - openPosition.price) * openPosition.amount;
        realizedPnl += pnl;
        totalTrades++;
        if (pnl > 0) wins++;

        const dateKey = action.timestamp.toISOString().split('T')[0];
        dailyPnlMap.set(dateKey, (dailyPnlMap.get(dateKey) || 0) + pnl);

        openPosition = null;
      }
    }

    const dailyPnl = [...dailyPnlMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, pnl]) => ({ date, pnl: Math.round(pnl * 100) / 100 }));

    return {
      totalCandles: candles.length,
      totalSignals: actions.length,
      buySignals,
      sellSignals,
      totalTrades,
      winRate: totalTrades > 0 ? wins / totalTrades : 0,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      dailyPnl,
    };
  }

  private async publishCompleted(event: BacktestCompletedEvent) {
    await this.producer.send({
      topic: KAFKA_TOPICS.FLOW_BACKTEST_COMPLETED,
      messages: [
        {
          key: event.flowId,
          value: JSON.stringify(event),
        },
      ],
    });
  }
}
