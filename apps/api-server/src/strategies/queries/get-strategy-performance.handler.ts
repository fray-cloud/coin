import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetStrategyPerformanceQuery } from './get-strategy-performance.query';

interface PerformanceResult {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  realizedPnl: number;
  dailyPnl: Array<{ date: string; pnl: number }>;
}

@QueryHandler(GetStrategyPerformanceQuery)
export class GetStrategyPerformanceHandler implements IQueryHandler<GetStrategyPerformanceQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStrategyPerformanceQuery): Promise<PerformanceResult> {
    const { userId, strategyId } = query;

    const strategy = await this.prisma.strategy.findFirst({
      where: { id: strategyId, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    // Get all order_placed logs with orderId in details
    const logs = await this.prisma.strategyLog.findMany({
      where: { strategyId, action: 'order_placed' },
      orderBy: { createdAt: 'asc' },
    });

    const orderIds = logs
      .map((log) => {
        const details = log.details as Record<string, unknown>;
        return details?.orderId as string | undefined;
      })
      .filter((id): id is string => !!id);

    if (orderIds.length === 0) {
      return {
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        realizedPnl: 0,
        dailyPnl: [],
      };
    }

    // Fetch filled orders
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds }, status: 'filled' },
      orderBy: { createdAt: 'asc' },
    });

    const buyOrders = orders.filter((o) => o.side === 'buy');
    const sellOrders = orders.filter((o) => o.side === 'sell');

    // Build average cost from buys
    let totalBuyCost = 0;
    let totalBuyQty = 0;
    for (const o of buyOrders) {
      const qty = parseFloat(o.filledQuantity);
      const price = parseFloat(o.filledPrice);
      if (qty > 0 && price > 0) {
        totalBuyCost += qty * price;
        totalBuyQty += qty;
      }
    }
    const avgBuyPrice = totalBuyQty > 0 ? totalBuyCost / totalBuyQty : 0;

    // Calculate realized P&L from sells
    let realizedPnl = 0;
    let wins = 0;
    let losses = 0;
    const dailyMap = new Map<string, number>();

    for (const o of sellOrders) {
      const qty = parseFloat(o.filledQuantity);
      const price = parseFloat(o.filledPrice);
      const fee = parseFloat(o.fee);
      if (qty <= 0 || price <= 0) continue;

      const tradePnl = (price - avgBuyPrice) * qty - fee;
      realizedPnl += tradePnl;

      if (tradePnl > 0) wins++;
      else losses++;

      const date = o.createdAt.toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + tradePnl);
    }

    // Build cumulative daily P&L
    let cumulative = 0;
    const dailyPnl = Array.from(dailyMap.entries()).map(([date, pnl]) => {
      cumulative += pnl;
      return { date, pnl: Math.round(cumulative * 100) / 100 };
    });

    const totalSellTrades = wins + losses;

    return {
      totalTrades: orders.length,
      buyTrades: buyOrders.length,
      sellTrades: sellOrders.length,
      wins,
      losses,
      winRate: totalSellTrades > 0 ? Math.round((wins / totalSellTrades) * 100) : 0,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      dailyPnl,
    };
  }
}
