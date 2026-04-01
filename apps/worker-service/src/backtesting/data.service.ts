import { Injectable, Logger } from '@nestjs/common';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';
import type { OhlcvCandle } from './backtesting.types';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

/** Maximum candles per single REST call */
const FETCH_LIMIT = 200;

@Injectable()
export class DataService {
  private readonly logger = new Logger(DataService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns stored candles for the given market/interval within [startTime, endTime].
   * Fetches from the exchange adapter if the DB has no data for this market.
   */
  async getCandles(
    exchange: string,
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<OhlcvCandle[]> {
    const stored = await this.loadFromDb(exchange, symbol, interval, startTime, endTime);
    if (stored.length > 0) {
      return stored;
    }

    // No data in DB — fetch up to FETCH_LIMIT candles from the exchange and persist them.
    const fetched = await this.fetchAndStore(exchange, symbol, interval);
    return fetched.filter((c) => c.timestamp >= startTime && c.timestamp <= endTime);
  }

  /**
   * Fetches fresh candles from the exchange adapter, upserts them into the DB, and returns them.
   */
  async fetchAndStore(exchange: string, symbol: string, interval: string): Promise<OhlcvCandle[]> {
    const adapterFactory = REST_ADAPTERS[exchange as ExchangeId];
    if (!adapterFactory) {
      this.logger.warn(`No REST adapter for exchange: ${exchange}`);
      return [];
    }

    const adapter = adapterFactory();
    let rawCandles;
    try {
      rawCandles = await adapter.getCandles(symbol, interval, FETCH_LIMIT);
    } catch (err) {
      this.logger.error(`Failed to fetch candles from ${exchange}: ${err}`);
      return [];
    }

    if (!rawCandles || rawCandles.length === 0) return [];

    const candles: OhlcvCandle[] = rawCandles.map((c) => ({
      timestamp: c.timestamp,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume),
    }));

    await this.upsertCandles(exchange, symbol, interval, candles);
    return candles;
  }

  private async loadFromDb(
    exchange: string,
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<OhlcvCandle[]> {
    const rows = await this.prisma.candle.findMany({
      where: {
        exchange,
        symbol,
        interval,
        timestamp: { gte: BigInt(startTime), lte: BigInt(endTime) },
      },
      orderBy: { timestamp: 'asc' },
    });

    return rows.map((r) => ({
      timestamp: Number(r.timestamp),
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }));
  }

  private async upsertCandles(
    exchange: string,
    symbol: string,
    interval: string,
    candles: OhlcvCandle[],
  ): Promise<void> {
    // Batch upsert using createMany with skipDuplicates for efficiency
    await this.prisma.candle.createMany({
      data: candles.map((c) => ({
        exchange,
        symbol,
        interval,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        timestamp: BigInt(c.timestamp),
      })),
      skipDuplicates: true,
    });
    this.logger.debug(`Upserted ${candles.length} candles for ${exchange}:${symbol}:${interval}`);
  }
}
