import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BinanceRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId, ExchangeCredentials, Ticker } from '@coin/types';
import { decrypt } from '@coin/utils';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  binance: () => new BinanceRest(),
};

export type PortfolioNetwork = 'testnet' | 'mainnet' | 'all';

interface PortfolioAsset {
  exchange: string;
  currency: string;
  network: 'testnet' | 'mainnet';
  quantity: string;
  avgCost: number;
  currentPrice: number;
  /** Quote-asset value (USDT for Binance Futures). Frontend converts to user's base currency. */
  valueUsd: number;
  pnl: number;
}

interface NetworkBreakdown {
  totalValueUsd: number;
  realizedPnl: number;
  unrealizedPnl: number;
  dailyPnl: Array<{ date: string; pnl: number }>;
}

function parseBaseCurrency(_exchange: string, symbol: string): string {
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

  async getSummary(userId: string, network?: PortfolioNetwork) {
    const effective: PortfolioNetwork = network ?? 'all';
    const masterKey = this.config.getOrThrow<string>('ENCRYPTION_MASTER_KEY');

    const keys = await this.prisma.exchangeKey.findMany({ where: { userId } });
    const filteredKeys =
      effective === 'all' ? keys : keys.filter((k) => (k.network ?? 'mainnet') === effective);

    // Filled or closed orders joined with exchangeKey so we can split by network.
    // 'closed' orders carry realizedPnl set by the close-saga or reconciler;
    // excluding them would zero out realized PnL on testnet/mainnet.
    const filledOrders = await this.prisma.order.findMany({
      where: { userId, status: { in: ['filled', 'closed'] } },
      include: { exchangeKey: { select: { network: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const ordersByNetwork = {
      testnet: filledOrders.filter((o) => (o.exchangeKey?.network ?? 'mainnet') === 'testnet'),
      mainnet: filledOrders.filter((o) => (o.exchangeKey?.network ?? 'mainnet') === 'mainnet'),
    };

    const assets: PortfolioAsset[] = [];
    for (const key of filteredKeys) {
      try {
        const credentials: ExchangeCredentials = {
          apiKey: decrypt(key.apiKey, masterKey),
          secretKey: decrypt(key.secretKey, masterKey),
          network: (key.network as 'mainnet' | 'testnet') ?? 'mainnet',
        };
        const adapter = REST_ADAPTERS[key.exchange as ExchangeId]();
        const balances = await adapter.getBalances(credentials);

        const keyNet: 'testnet' | 'mainnet' = (key.network as 'mainnet' | 'testnet') ?? 'mainnet';
        const avgCostMap = this.buildAvgCostMap(ordersByNetwork[keyNet]);

        for (const bal of balances) {
          const free = parseFloat(bal.free);
          const locked = parseFloat(bal.locked);
          const total = free + locked;
          if (total <= 0) continue;

          const currentPrice = await this.getTickerPrice(key.exchange, bal.currency);
          const costKey = `${key.exchange}|${bal.currency}`;
          const avgCost = avgCostMap.get(costKey) ?? 0;

          const valueUsd = currentPrice * total;
          const pnl = avgCost > 0 ? (currentPrice - avgCost) * total : 0;

          assets.push({
            exchange: key.exchange,
            currency: bal.currency,
            network: keyNet,
            quantity: total.toString(),
            avgCost,
            currentPrice,
            valueUsd,
            pnl,
          });
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch balances for ${key.exchange} (${key.network}): ${err}`);
      }
    }

    const breakdownFor = (rows: typeof filledOrders) => {
      const avgCostMap = this.buildAvgCostMap(rows);
      const deltas = this.dailyDeltaMap(rows);
      const summary: NetworkBreakdown = {
        totalValueUsd: 0,
        realizedPnl: this.calculateRealizedPnl(rows, avgCostMap),
        unrealizedPnl: 0,
        dailyPnl: this.toCumulative(deltas),
      };
      return { summary, deltas };
    };

    const testnetView = breakdownFor(ordersByNetwork.testnet);
    const mainnetView = breakdownFor(ordersByNetwork.mainnet);
    const testnetBreakdown = testnetView.summary;
    const mainnetBreakdown = mainnetView.summary;
    testnetBreakdown.totalValueUsd = assets
      .filter((a) => a.network === 'testnet')
      .reduce((s, a) => s + a.valueUsd, 0);
    testnetBreakdown.unrealizedPnl = assets
      .filter((a) => a.network === 'testnet')
      .reduce((s, a) => s + a.pnl, 0);
    mainnetBreakdown.totalValueUsd = assets
      .filter((a) => a.network === 'mainnet')
      .reduce((s, a) => s + a.valueUsd, 0);
    mainnetBreakdown.unrealizedPnl = assets
      .filter((a) => a.network === 'mainnet')
      .reduce((s, a) => s + a.pnl, 0);

    let totalValueUsd: number;
    let realizedPnl: number;
    let unrealizedPnl: number;
    let dailyPnl: Array<{ date: string; pnl: number }>;
    if (effective === 'testnet') {
      ({ totalValueUsd, realizedPnl, unrealizedPnl, dailyPnl } = testnetBreakdown);
    } else if (effective === 'mainnet') {
      ({ totalValueUsd, realizedPnl, unrealizedPnl, dailyPnl } = mainnetBreakdown);
    } else {
      totalValueUsd = testnetBreakdown.totalValueUsd + mainnetBreakdown.totalValueUsd;
      realizedPnl = testnetBreakdown.realizedPnl + mainnetBreakdown.realizedPnl;
      unrealizedPnl = testnetBreakdown.unrealizedPnl + mainnetBreakdown.unrealizedPnl;
      const merged = new Map<string, number>();
      for (const [d, v] of testnetView.deltas) merged.set(d, (merged.get(d) ?? 0) + v);
      for (const [d, v] of mainnetView.deltas) merged.set(d, (merged.get(d) ?? 0) + v);
      dailyPnl = this.toCumulative(merged);
    }

    return {
      network: effective,
      totalValueUsd,
      realizedPnl,
      unrealizedPnl,
      assets,
      dailyPnl,
      byNetwork: { testnet: testnetBreakdown, mainnet: mainnetBreakdown },
    };
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
      // Treat futures 'long' as buy, 'short' as sell for spot-style cost basis.
      const isBuy = order.side === 'buy' || order.side === 'long';
      if (!isBuy) continue;

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
    const symbols = [`${currency}USDT`, `${currency}USD`];

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
      realizedPnl?: string | null;
    }>,
    avgCostMap: Map<string, number>,
  ): number {
    let realized = 0;

    for (const order of orders) {
      // Prefer Binance-reported realizedPnl when present (futures positions
      // closed via TP/SL/manual). Falls back to spot-style cost basis math.
      if (order.realizedPnl) {
        const r = parseFloat(order.realizedPnl);
        if (Number.isFinite(r) && r !== 0) {
          realized += r;
          continue;
        }
      }

      const isSell = order.side === 'sell' || order.side === 'short';
      if (!isSell) continue;

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

  private dailyDeltaMap(
    orders: Array<{
      createdAt: Date;
      side: string;
      filledQuantity: string;
      filledPrice: string;
      fee: string;
      realizedPnl?: string | null;
    }>,
  ): Map<string, number> {
    const dailyMap = new Map<string, number>();

    for (const order of orders) {
      const date = order.createdAt.toISOString().split('T')[0];
      const current = dailyMap.get(date) || 0;

      if (order.realizedPnl) {
        const r = parseFloat(order.realizedPnl);
        if (Number.isFinite(r) && r !== 0) {
          dailyMap.set(date, current + r);
          continue;
        }
      }

      const qty = parseFloat(order.filledQuantity);
      const price = parseFloat(order.filledPrice);
      const fee = parseFloat(order.fee);
      const value = qty * price;
      const isSell = order.side === 'sell' || order.side === 'short';

      dailyMap.set(date, isSell ? current + value - fee : current - value - fee);
    }
    return dailyMap;
  }

  private toCumulative(deltas: Map<string, number>): Array<{ date: string; pnl: number }> {
    let cumulative = 0;
    return Array.from(deltas.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, pnl]) => {
        cumulative += pnl;
        return { date, pnl: Math.round(cumulative * 100) / 100 };
      });
  }
}
