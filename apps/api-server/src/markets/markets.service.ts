import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import Redis from 'ioredis';
import { Ticker } from '@coin/types';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderResultEvent } from '@coin/kafka-contracts';
import { PrismaService } from '../prisma/prisma.service';

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
  private redis: Redis;
  private tickerListeners: ((ticker: Ticker) => void)[] = [];
  private orderListeners: ((payload: OrderUpdatePayload) => void)[] = [];

  constructor(private readonly prisma: PrismaService) {
    this.kafka = new Kafka({
      clientId: 'api-server',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.tickerConsumer = this.kafka.consumer({ groupId: 'api-server-ticker' });
    this.orderConsumer = this.kafka.consumer({ groupId: 'api-server-orders' });
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async onModuleInit() {
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

    this.logger.log('Kafka consumers started - listening for ticker and order updates');
  }

  async onModuleDestroy() {
    await this.tickerConsumer.disconnect();
    await this.orderConsumer.disconnect();
    this.redis.disconnect();
  }

  onTicker(callback: (ticker: Ticker) => void) {
    this.tickerListeners.push(callback);
  }

  onOrderUpdate(callback: (payload: OrderUpdatePayload) => void) {
    this.orderListeners.push(callback);
  }

  private async handleOrderResult(event: OrderResultEvent) {
    const { dbOrderId, userId, result } = event;

    // DB 업데이트
    await this.prisma.order.update({
      where: { id: dbOrderId },
      data: {
        status: result.status,
        exchangeOrderId: result.orderId || undefined,
        filledQuantity: result.filledQuantity,
        filledPrice: result.filledPrice,
        fee: result.fee,
        feeCurrency: result.feeCurrency,
      },
    });

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
  }

  async getLatestTicker(exchange: string, symbol: string): Promise<Ticker | null> {
    const key = `ticker:${exchange}:${symbol}`;
    const data = await this.redis.get(key);
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
