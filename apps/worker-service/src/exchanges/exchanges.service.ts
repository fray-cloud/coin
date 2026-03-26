import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { Ticker } from '@coin/types';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import {
  UpbitWebSocket,
  BinanceWebSocket,
  BybitWebSocket,
  IExchangeWebSocket,
} from '@coin/exchange-adapters';
import { PaperEngineService } from '../orders/paper-engine.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class ExchangesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExchangesService.name);
  private readonly adapters: IExchangeWebSocket[] = [];
  private kafka: Kafka;
  private producer: Producer;
  private redis: Redis;

  constructor(
    private readonly paperEngine: PaperEngineService,
    private readonly ordersService: OrdersService,
  ) {
    this.kafka = new Kafka({
      clientId: 'worker-service',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  private exchangeRateInterval: ReturnType<typeof setInterval> | null = null;

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Kafka producer connected');

    // Fetch exchange rate immediately and every 5 minutes
    this.fetchExchangeRate();
    this.exchangeRateInterval = setInterval(() => this.fetchExchangeRate(), 5 * 60 * 1000);

    const upbit = new UpbitWebSocket({
      onConnected: () => this.logger.log('Upbit WebSocket connected'),
      onDisconnected: () => this.logger.warn('Upbit WebSocket disconnected'),
      onError: (err) => this.logger.error(`Upbit WS error: ${err.message}`),
    });

    const binance = new BinanceWebSocket({
      onConnected: () => this.logger.log('Binance WebSocket connected'),
      onDisconnected: () => this.logger.warn('Binance WebSocket disconnected'),
      onError: (err) => this.logger.error(`Binance WS error: ${err.message}`),
    });

    const bybit = new BybitWebSocket({
      onConnected: () => this.logger.log('Bybit WebSocket connected'),
      onDisconnected: () => this.logger.warn('Bybit WebSocket disconnected'),
      onError: (err) => this.logger.error(`Bybit WS error: ${err.message}`),
    });

    const tickerHandler = (ticker: Ticker) => this.handleTicker(ticker);

    // Upbit: KRW-BTC 형식
    upbit.subscribeTicker(['KRW-BTC', 'KRW-ETH', 'KRW-XRP'], tickerHandler);
    upbit.connect();

    // Binance: BTCUSDT 형식
    binance.subscribeTicker(['BTCUSDT', 'ETHUSDT', 'XRPUSDT'], tickerHandler);

    // Bybit: BTCUSDT 형식
    bybit.subscribeTicker(['BTCUSDT', 'ETHUSDT', 'XRPUSDT'], tickerHandler);
    bybit.connect();

    this.adapters.push(upbit, binance, bybit);
    this.logger.log('All exchange WebSocket adapters started');
  }

  async onModuleDestroy() {
    if (this.exchangeRateInterval) clearInterval(this.exchangeRateInterval);
    for (const adapter of this.adapters) {
      adapter.disconnect();
    }
    await this.producer.disconnect();
    this.redis.disconnect();
    this.logger.log('All connections closed');
  }

  private async fetchExchangeRate() {
    try {
      const res = await fetch(
        'https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD',
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Array<{ basePrice: number }>;
      const rate = data?.[0]?.basePrice;
      if (rate && typeof rate === 'number') {
        await this.redis.set(
          'exchange-rate:KRW-USD',
          JSON.stringify({ krwPerUsd: rate, updatedAt: new Date().toISOString() }),
          'EX',
          600,
        );
        this.logger.log(`Exchange rate updated: 1 USD = ${rate} KRW`);
      }
    } catch (err) {
      this.logger.warn(`Failed to fetch exchange rate: ${err}`);
    }
  }

  private async handleTicker(ticker: Ticker) {
    try {
      const key = `ticker:${ticker.exchange}:${ticker.symbol}`;
      const tickerJson = JSON.stringify(ticker);

      const priceKey = `prices:${ticker.exchange}:${ticker.symbol}`;
      const now = Date.now();

      await Promise.all([
        this.redis.set(key, tickerJson, 'EX', 5),
        this.producer.send({
          topic: KAFKA_TOPICS.MARKET_TICKER_UPDATED,
          messages: [
            {
              key: `${ticker.exchange}:${ticker.symbol}`,
              value: tickerJson,
            },
          ],
        }),
        this.redis
          .multi()
          .zadd(priceKey, now, `${now}:${ticker.price}`)
          .zremrangebyrank(priceKey, 0, -501)
          .expire(priceKey, 3600)
          .exec(),
      ]);

      // 페이퍼 지정가 주문 체결 체크
      await this.paperEngine.checkPendingOrders(ticker, this.ordersService.getProducer());
    } catch (err) {
      this.logger.error(`Failed to process ticker: ${err}`);
    }
  }
}
