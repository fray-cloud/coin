import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import type { Ticker } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';

export interface NetworkPnlBucket {
  testnet: number;
  mainnet: number;
}

@Injectable()
export class DashboardService {
  private redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async getSummary(userId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 6);

    const [todayOrders, weekOrders, openPositions, recentDecisions] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          userId,
          status: { in: ['filled', 'closed'] },
          updatedAt: { gte: startOfToday },
          realizedPnl: { not: null },
        },
        include: { exchangeKey: { select: { network: true } } },
      }),
      this.prisma.order.findMany({
        where: {
          userId,
          status: { in: ['filled', 'closed'] },
          updatedAt: { gte: startOfWeek },
          realizedPnl: { not: null },
        },
        include: { exchangeKey: { select: { network: true } } },
      }),
      this.prisma.order.findMany({
        where: { userId, status: 'filled', closedAt: null, mode: 'real' },
        include: { exchangeKey: { select: { network: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.llmDecisionLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              symbol: true,
              side: true,
              entryPrice: true,
              takeProfitPrice: true,
              stopLossPrice: true,
              realizedPnl: true,
              closedAt: true,
            },
          },
        },
      }),
    ]);

    const positionsWithMark = await Promise.all(
      openPositions.map(async (p) => {
        const markPrice = await this.fetchMarkPrice(p.exchange, p.symbol);
        const unrealizedPnl = this.computeUnrealizedPnl(p, markPrice);
        return { ...p, markPrice, unrealizedPnl };
      }),
    );

    return {
      pnl: {
        today: this.bucketByNetwork(todayOrders),
        week: this.bucketByNetwork(weekOrders),
      },
      openPositions: positionsWithMark,
      recentDecisions,
    };
  }

  private bucketByNetwork(
    rows: Array<{ realizedPnl: string | null; exchangeKey: { network: string } | null }>,
  ): NetworkPnlBucket {
    const acc: NetworkPnlBucket = { testnet: 0, mainnet: 0 };
    for (const r of rows) {
      const v = Number(r.realizedPnl ?? 0);
      if (!Number.isFinite(v)) continue;
      const net = (r.exchangeKey?.network ?? 'mainnet') as keyof NetworkPnlBucket;
      acc[net] += v;
    }
    acc.testnet = Math.round(acc.testnet * 100) / 100;
    acc.mainnet = Math.round(acc.mainnet * 100) / 100;
    return acc;
  }

  private async fetchMarkPrice(exchange: string, symbol: string): Promise<number | null> {
    const data = await this.redis.get(`ticker:${exchange}:${symbol}`);
    if (!data) return null;
    const ticker: Ticker = JSON.parse(data);
    const n = Number(ticker.price);
    return Number.isFinite(n) ? n : null;
  }

  private computeUnrealizedPnl(
    order: { side: string; entryPrice: string | null; filledQuantity: string },
    markPrice: number | null,
  ): number | null {
    if (markPrice == null) return null;
    const entry = Number(order.entryPrice ?? 0);
    const qty = Number(order.filledQuantity ?? 0);
    if (!entry || !qty) return null;
    const direction = order.side === 'long' ? 1 : -1;
    return Math.round((markPrice - entry) * qty * direction * 100) / 100;
  }
}
