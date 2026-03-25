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

  async getSummary(userId: string) {
    const masterKey = this.config.getOrThrow<string>('ENCRYPTION_MASTER_KEY');

    // 1. Fetch balances from all exchange keys
    const keys = await this.prisma.exchangeKey.findMany({
      where: { userId },
    });

    const assets: PortfolioAsset[] = [];

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
          const avgCost = await this.getAvgCost(userId, key.exchange, bal.currency);

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

    // 2. Calculate realized P&L from filled orders
    const realizedPnl = await this.calculateRealizedPnl(userId);

    // 3. Calculate daily P&L from orders
    const dailyPnl = await this.calculateDailyPnl(userId);

    const totalValueKrw = assets.reduce((sum, a) => sum + a.valueKrw, 0);
    const unrealizedPnl = assets.reduce((sum, a) => sum + a.pnl, 0);

    return { totalValueKrw, realizedPnl, unrealizedPnl, assets, dailyPnl };
  }

  private async getTickerPrice(exchange: string, currency: string): Promise<number> {
    // Try common symbol patterns
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

    // Base currencies (KRW, USDT) have value 1
    if (['KRW', 'USDT', 'USD'].includes(currency)) return 1;

    return 0;
  }

  private async getAvgCost(userId: string, exchange: string, currency: string): Promise<number> {
    // Find buy orders for this currency on this exchange
    const buyOrders = await this.prisma.order.findMany({
      where: {
        userId,
        exchange,
        side: 'buy',
        status: 'filled',
        symbol: { contains: currency },
      },
    });

    let totalCost = 0;
    let totalQty = 0;
    for (const order of buyOrders) {
      const qty = parseFloat(order.filledQuantity);
      const price = parseFloat(order.filledPrice);
      if (qty > 0 && price > 0) {
        totalCost += qty * price;
        totalQty += qty;
      }
    }

    return totalQty > 0 ? totalCost / totalQty : 0;
  }

  private async calculateRealizedPnl(userId: string): Promise<number> {
    const sellOrders = await this.prisma.order.findMany({
      where: { userId, side: 'sell', status: 'filled' },
    });

    let realized = 0;
    for (const order of sellOrders) {
      const qty = parseFloat(order.filledQuantity);
      const price = parseFloat(order.filledPrice);
      const fee = parseFloat(order.fee);

      // Get average cost for this symbol
      const parts = order.symbol.split('-');
      const currency = parts.length > 1 ? parts[1] : parts[0].replace('USDT', '');
      const avgCost = await this.getAvgCost(userId, order.exchange, currency);

      if (avgCost > 0) {
        realized += (price - avgCost) * qty - fee;
      }
    }

    return Math.round(realized * 100) / 100;
  }

  private async calculateDailyPnl(userId: string): Promise<Array<{ date: string; pnl: number }>> {
    const orders = await this.prisma.order.findMany({
      where: { userId, status: 'filled' },
      orderBy: { createdAt: 'asc' },
    });

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

    // Cumulative P&L
    let cumulative = 0;
    return Array.from(dailyMap.entries()).map(([date, pnl]) => {
      cumulative += pnl;
      return { date, pnl: Math.round(cumulative * 100) / 100 };
    });
  }
}
