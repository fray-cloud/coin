import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import Redis from 'ioredis';
import { Ticker } from '@coin/types';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';

@Injectable()
export class MarketsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketsService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private redis: Redis;
  private tickerListeners: ((ticker: Ticker) => void)[] = [];

  constructor() {
    this.kafka = new Kafka({
      clientId: 'api-server',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.consumer = this.kafka.consumer({ groupId: 'api-server-group' });
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: KAFKA_TOPICS.MARKET_TICKER_UPDATED,
      fromBeginning: false,
    });

    await this.consumer.run({
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

    this.logger.log('Kafka consumer started - listening for ticker updates');
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.redis.disconnect();
  }

  onTicker(callback: (ticker: Ticker) => void) {
    this.tickerListeners.push(callback);
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
    return values
      .filter((v): v is string => v !== null)
      .map((v) => JSON.parse(v));
  }
}
