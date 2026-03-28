import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { Ticker } from '@coin/types';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type {
  OrderResultEvent,
  StrategySignalEvent,
  NotificationEvent,
} from '@coin/kafka-contracts';
import { PrismaService } from '../prisma/prisma.service';
import { executePositionUpdateSaga } from '../portfolio/sagas/position-update-steps';

export interface StrategySignalPayload {
  strategyId: string;
  userId: string;
  exchange: string;
  symbol: string;
  signal: 'buy' | 'sell';
  strategyType: string;
  reason: string;
}

export interface OrderUpdatePayload {
  userId: string;
  orderId: string;
  status: string;
  filledQuantity: string;
  filledPrice: string;
  fee: string;
  feeCurrency: string;
}

@Injectable()
export class MarketsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketsService.name);
  private kafka: Kafka;
  private tickerConsumer: Consumer;
  private orderConsumer: Consumer;
  private strategyConsumer: Consumer;
  private producer: Producer;
  private redis: Redis;
  private tickerListeners: ((ticker: Ticker) => void)[] = [];
  private orderListeners: ((payload: OrderUpdatePayload) => void)[] = [];
  private strategySignalListeners: ((payload: StrategySignalPayload) => void)[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.kafka = new Kafka({
      clientId: 'api-server',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.tickerConsumer = this.kafka.consumer({ groupId: 'api-server-ticker' });
    this.orderConsumer = this.kafka.consumer({ groupId: 'api-server-orders' });
    this.strategyConsumer = this.kafka.consumer({ groupId: 'api-server-strategies' });
    this.producer = this.kafka.producer();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async onModuleInit() {
    await this.producer.connect();

    // Ticker consumer
    await this.tickerConsumer.connect();
    await this.tickerConsumer.subscribe({
      topic: KAFKA_TOPICS.MARKET_TICKER_UPDATED,
      fromBeginning: false,
    });

    await this.tickerConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const ticker: Ticker = JSON.parse(message.value.toString());
          for (const listener of this.tickerListeners) {
            listener(ticker);
          }
        } catch (err) {
          this.logger.error(`Failed to parse ticker: ${err}`);
        }
      },
    });

    // Order result consumer
    await this.orderConsumer.connect();
    await this.orderConsumer.subscribe({
      topic: KAFKA_TOPICS.TRADING_ORDER_RESULT,
      fromBeginning: false,
    });

    await this.orderConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const event: OrderResultEvent = JSON.parse(message.value.toString());
          await this.handleOrderResult(event);
        } catch (err) {
          this.logger.error(`Failed to process order result: ${err}`);
        }
      },
    });

    // Strategy signal consumer
    await this.strategyConsumer.connect();
    await this.strategyConsumer.subscribe({
      topic: KAFKA_TOPICS.TRADING_STRATEGY_SIGNAL,
      fromBeginning: false,
    });

    await this.strategyConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const event: StrategySignalEvent = JSON.parse(message.value.toString());
          const payload: StrategySignalPayload = {
            strategyId: event.strategyId,
            userId: event.userId,
            exchange: event.exchange,
            symbol: event.symbol,
            signal: event.signal,
            strategyType: event.strategyType,
            reason: event.reason,
          };
          for (const listener of this.strategySignalListeners) {
            listener(payload);
          }
        } catch (err) {
          this.logger.error(`Failed to process strategy signal: ${err}`);
        }
      },
    });

    this.logger.log('Kafka consumers started - listening for ticker, order, and strategy updates');
  }

  async onModuleDestroy() {
    await this.tickerConsumer.disconnect();
    await this.orderConsumer.disconnect();
    await this.strategyConsumer.disconnect();
    await this.producer.disconnect();
    this.redis.disconnect();
  }

  onTicker(callback: (ticker: Ticker) => void) {
    this.tickerListeners.push(callback);
  }

  onOrderUpdate(callback: (payload: OrderUpdatePayload) => void) {
    this.orderListeners.push(callback);
  }

  onStrategySignal(callback: (payload: StrategySignalPayload) => void) {
    this.strategySignalListeners.push(callback);
  }

  setOrchestrator(orchestrator: any) {
    this.orchestrator = orchestrator;
  }

  private orchestrator: any = null;

  private async handleOrderResult(event: OrderResultEvent) {
    const { dbOrderId, userId, result } = event;

    // Saga completion — Worker already updated DB
    if (this.orchestrator) {
      await this.orchestrator.onWorkerResult(event.requestId, result);
    }

    // WebSocket으로 브로드캐스트
    const payload: OrderUpdatePayload = {
      userId,
      orderId: dbOrderId,
      status: result.status,
      filledQuantity: result.filledQuantity,
      filledPrice: result.filledPrice,
      fee: result.fee,
      feeCurrency: result.feeCurrency,
    };

    for (const listener of this.orderListeners) {
      listener(payload);
    }

    // Emit notification
    const isFilled = result.status === 'filled' || result.status === 'partial';
    const isFailed = result.status === 'failed';
    if (isFilled || isFailed) {
      const notif: NotificationEvent = {
        userId,
        type: isFilled ? 'order_filled' : 'order_failed',
        title: isFilled
          ? `주문 체결 | ${result.exchange.toUpperCase()} ${result.symbol}`
          : `주문 실패 | ${result.exchange.toUpperCase()} ${result.symbol}`,
        message: isFilled
          ? `${result.side.toUpperCase()} ${result.filledQuantity} @ ${result.filledPrice}`
          : `${result.side.toUpperCase()} ${result.quantity} — 체결 실패`,
      };
      await this.producer.send({
        topic: KAFKA_TOPICS.NOTIFICATION_SEND,
        messages: [{ key: userId, value: JSON.stringify(notif) }],
      });
    }

    // Position update saga for filled orders
    if (isFilled) {
      try {
        await executePositionUpdateSaga(
          {
            userId,
            orderId: dbOrderId,
            exchange: result.exchange,
            symbol: result.symbol,
            side: result.side,
            filledQuantity: result.filledQuantity,
            filledPrice: result.filledPrice,
            fee: result.fee,
            feeCurrency: result.feeCurrency,
          },
          this.prisma,
          this.producer,
        );
      } catch (err) {
        this.logger.error(`Position update saga failed for ${dbOrderId}: ${err}`);
      }
    }
  }

  async getLatestTicker(exchange: string, symbol: string): Promise<Ticker | null> {
    const key = `ticker:${exchange}:${symbol}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getExchangeRate(): Promise<{ krwPerUsd: number; updatedAt: string } | null> {
    const data = await this.redis.get('exchange-rate:KRW-USD');
    return data ? JSON.parse(data) : null;
  }

  async getAllTickers(): Promise<Ticker[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.redis.scan(cursor, 'MATCH', 'ticker:*', 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');

    if (keys.length === 0) return [];
    const values = await this.redis.mget(...keys);
    return values.filter((v): v is string => v !== null).map((v) => JSON.parse(v));
  }
}
