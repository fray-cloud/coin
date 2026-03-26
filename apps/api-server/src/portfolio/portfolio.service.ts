import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId, ExchangeCredentials, Ticker } from '@coin/types';
import { decrypt } from '@coin/utils';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

interface PortfolioAsset {
  exchange: string;
  currency: string;
  quantity: string;
  avgCost: number;
  currentPrice: number;
  valueKrw: number;
  pnl: number;
}

/**
 * Parse base currency from exchange-specific symbol format.
 * - Upbit: "KRW-BTC" → "BTC"
 * - Binance/Bybit: "BTCUSDT" → "BTC"
 */
function parseBaseCurrency(exchange: string, symbol: string): string {
  if (exchange === 'upbit') {
    const parts = symbol.split('-');
    return parts.length > 1 ? parts[1] : symbol;
  }
  // Binance / Bybit: remove known quote currencies
  for (const quote of ['USDT', 'BUSD', 'USD', 'USDC']) {
    if (symbol.endsWith(quote)) {
      return symbol.slice(0, -quote.length);
    }
  }
  return symbol;
}

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async getSummary(userId: string, mode?: 'paper' | 'real' | 'all') {
    const effectiveMode = mode || 'all';
    const masterKey = this.config.getOrThrow<string>('ENCRYPTION_MASTER_KEY');

    // Prefetch filled orders, optionally filtered by mode
    const orderWhere: { userId: string; status: string; mode?: string } = {
      userId,
      status: 'filled',
    };
    if (effectiveMode !== 'all') {
      orderWhere.mode = effectiveMode;
    }

    const allFilledOrders = await this.prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: 'asc' },
    });

    // Build avg cost map: key = "exchange|currency"
    const avgCostMap = this.buildAvgCostMap(allFilledOrders);

    const assets: PortfolioAsset[] = [];

    if (effectiveMode === 'paper') {
      // Paper mode: compute virtual balances from order history
      const virtualBalances = this.computePaperBalances(allFilledOrders);
      for (const [key, qty] of virtualBalances.entries()) {
        const [exchange, currency] = key.split('|');
        if (qty <= 0) continue;

        const currentPrice = await this.getTickerPrice(exchange, currency);
        const avgCost = avgCostMap.get(key) ?? 0;
        const valueKrw = currentPrice * qty;
        const pnl = avgCost > 0 ? (currentPrice - avgCost) * qty : 0;

        assets.push({
          exchange,
          currency,
          quantity: qty.toString(),
          avgCost,
          currentPrice,
          valueKrw,
          pnl,
        });
      }
    } else {
      // Real or All mode: fetch from exchange APIs
      const keys = await this.prisma.exchangeKey.findMany({
        where: { userId },
      });

      for (const key of keys) {
        try {
          const credentials: ExchangeCredentials = {
            apiKey: decrypt(key.apiKey, masterKey),
            secretKey: decrypt(key.secretKey, masterKey),
          };
          const adapter = REST_ADAPTERS[key.exchange as ExchangeId]();
          const balances = await adapter.getBalances(credentials);

          for (const bal of balances) {
            const free = parseFloat(bal.free);
            const locked = parseFloat(bal.locked);
            const total = free + locked;
            if (total <= 0) continue;

            const currentPrice = await this.getTickerPrice(key.exchange, bal.currency);
            const costKey = `${key.exchange}|${bal.currency}`;
            const avgCost = avgCostMap.get(costKey) ?? 0;

            const valueKrw = currentPrice * total;
            const pnl = avgCost > 0 ? (currentPrice - avgCost) * total : 0;

            assets.push({
              exchange: key.exchange,
              currency: bal.currency,
              quantity: total.toString(),
              avgCost,
              currentPrice,
              valueKrw,
              pnl,
            });
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch balances for ${key.exchange}: ${err}`);
        }
      }
    }

    // 2. Calculate realized P&L from prefetched orders
    const realizedPnl = this.calculateRealizedPnl(allFilledOrders, avgCostMap);

    // 3. Calculate daily P&L from prefetched orders
    const dailyPnl = this.calculateDailyPnl(allFilledOrders);

    const totalValueKrw = assets.reduce((sum, a) => sum + a.valueKrw, 0);
    const unrealizedPnl = assets.reduce((sum, a) => sum + a.pnl, 0);

    return { totalValueKrw, realizedPnl, unrealizedPnl, assets, dailyPnl, mode: effectiveMode };
  }

  private computePaperBalances(
    orders: Array<{
      exchange: string;
      symbol: string;
      side: string;
      filledQuantity: string;
      filledPrice: string;
    }>,
  ): Map<string, number> {
    const balances = new Map<string, number>();

    for (const order of orders) {
      const currency = parseBaseCurrency(order.exchange, order.symbol);
      const key = `${order.exchange}|${currency}`;
      const qty = parseFloat(order.filledQuantity);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      const current = balances.get(key) ?? 0;
      if (order.side === 'buy') {
        balances.set(key, current + qty);
      } else {
        balances.set(key, current - qty);
      }
    }

    return balances;
  }

  private buildAvgCostMap(
    orders: Array<{
      exchange: string;
      symbol: string;
      side: string;
      filledQuantity: string;
      filledPrice: string;
    }>,
  ): Map<string, number> {
    const aggregates = new Map<string, { totalCost: number; totalQty: number }>();

    for (const order of orders) {
      if (order.side !== 'buy') continue;

      const qty = parseFloat(order.filledQuantity);
      const price = parseFloat(order.filledPrice);
      if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price <= 0) continue;

      const currency = parseBaseCurrency(order.exchange, order.symbol);
      const key = `${order.exchange}|${currency}`;

      const existing = aggregates.get(key) ?? { totalCost: 0, totalQty: 0 };
      existing.totalCost += qty * price;
      existing.totalQty += qty;
      aggregates.set(key, existing);
    }

    const result = new Map<string, number>();
    for (const [key, { totalCost, totalQty }] of aggregates.entries()) {
      result.set(key, totalQty > 0 ? totalCost / totalQty : 0);
    }
    return result;
  }

  private async getTickerPrice(exchange: string, currency: string): Promise<number> {
    const symbols =
      exchange === 'upbit' ? [`KRW-${currency}`] : [`${currency}USDT`, `${currency}USD`];

    for (const symbol of symbols) {
      const key = `ticker:${exchange}:${symbol}`;
      const data = await this.redis.get(key);
      if (data) {
        const ticker: Ticker = JSON.parse(data);
        return parseFloat(ticker.price);
      }
    }

    if (['KRW', 'USDT', 'USD'].includes(currency)) return 1;
    return 0;
  }

  private calculateRealizedPnl(
    orders: Array<{
      exchange: string;
      symbol: string;
      side: string;
      filledQuantity: string;
      filledPrice: string;
      fee: string;
    }>,
    avgCostMap: Map<string, number>,
  ): number {
    let realized = 0;

    for (const order of orders) {
      if (order.side !== 'sell') continue;

      const qty = parseFloat(order.filledQuantity);
      const price = parseFloat(order.filledPrice);
      const fee = parseFloat(order.fee);
      if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price <= 0) continue;

      const currency = parseBaseCurrency(order.exchange, order.symbol);
      const key = `${order.exchange}|${currency}`;
      const avgCost = avgCostMap.get(key) ?? 0;

      if (avgCost > 0) {
        realized += (price - avgCost) * qty - fee;
      }
    }

    return Math.round(realized * 100) / 100;
  }

  private calculateDailyPnl(
    orders: Array<{
      createdAt: Date;
      side: string;
      filledQuantity: string;
      filledPrice: string;
      fee: string;
    }>,
  ): Array<{ date: string; pnl: number }> {
    const dailyMap = new Map<string, number>();

    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      const qty = parseFloat(order.filledQuantity);
      const price = parseFloat(order.filledPrice);
      const fee = parseFloat(order.fee);
      const value = qty * price;

      const current = dailyMap.get(date) || 0;
      if (order.side === 'sell') {
        dailyMap.set(date, current + value - fee);
      } else {
        dailyMap.set(date, current - value - fee);
      }
    }

    let cumulative = 0;
    return Array.from(dailyMap.entries()).map(([date, pnl]) => {
      cumulative += pnl;
      return { date, pnl: Math.round(cumulative * 100) / 100 };
    });
  }
}
