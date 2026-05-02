import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { BinanceRest } from '@coin/exchange-adapters';
import type { FundingRateRecord, OpenInterestPoint } from '@coin/types';
import { buildMarketContext, type BuildDeps } from './build-market-context';
import type { MarketContext } from './market-context.types';

const FUNDING_TTL_SEC = 3600; // 1h — funding settles every 8h
const OI_TTL_SEC = 60; // 1min — OI moves continuously

@Injectable()
export class MarketContextService implements OnModuleDestroy {
  private readonly logger = new Logger(MarketContextService.name);
  private readonly redis: Redis;
  private readonly binance = new BinanceRest();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }

  build(opts: {
    symbol: string;
    interval: string;
    promptCandleCount: number;
  }): Promise<MarketContext> {
    const deps: BuildDeps = {
      fetchCandles: (s, i, n) => this.binance.getCandles(s, i, n),
      fetchFundingHistory: (s, n) =>
        this.cached(`funding:history:${s}`, FUNDING_TTL_SEC, () =>
          this.binance.getFundingRateHistory(s, n),
        ) as Promise<FundingRateRecord[]>,
      fetchCurrentFunding: (s) =>
        this.cached(`funding:current:${s}`, FUNDING_TTL_SEC, () =>
          this.binance.getCurrentFundingRate(s),
        ) as Promise<{ symbol: string; lastFundingRate: string; nextFundingTime: number }>,
      fetchOpenInterestHistory: (s, p, n) =>
        this.cached(`oi:history:${s}:${p}`, OI_TTL_SEC, () =>
          this.binance.getOpenInterestHistory(s, p, n),
        ) as Promise<OpenInterestPoint[]>,
    };
    return buildMarketContext(opts, deps);
  }

  private async cached<T>(key: string, ttlSec: number, fetcher: () => Promise<T>): Promise<T> {
    try {
      const hit = await this.redis.get(key);
      if (hit) return JSON.parse(hit) as T;
    } catch (err) {
      this.logger.warn(`Redis read failed for ${key}: ${err}`);
    }
    const value = await fetcher();
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSec);
    } catch (err) {
      this.logger.warn(`Redis write failed for ${key}: ${err}`);
    }
    return value;
  }
}
