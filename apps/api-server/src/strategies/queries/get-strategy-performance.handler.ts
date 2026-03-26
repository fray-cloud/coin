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

    // Try auto mode first (real orders)
    const orderLogs = await this.prisma.strategyLog.findMany({
      where: { strategyId, action: 'order_placed' },
      orderBy: { createdAt: 'asc' },
    });

    if (orderLogs.length > 0) {
      return this.calculateFromOrders(orderLogs);
    }

    // Fall back to signal mode (simulate from signal_generated logs)
    const signalLogs = await this.prisma.strategyLog.findMany({
      where: { strategyId, action: 'signal_generated', signal: { not: null } },
      orderBy: { createdAt: 'asc' },
    });

    return this.calculateFromSignals(signalLogs, strategy.config as Record<string, unknown>);
  }

  private async calculateFromOrders(
    logs: Array<{ details: unknown; createdAt: Date }>,
  ): Promise<PerformanceResult> {
    const orderIds = logs
      .map((log) => {
        const details = log.details as Record<string, unknown>;
        return details?.orderId as string | undefined;
      })
      .filter((id): id is string => !!id);

    if (orderIds.length === 0) return this.emptyResult();

    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds }, status: 'filled' },
      orderBy: { createdAt: 'asc' },
    });

    const buyOrders = orders.filter((o) => o.side === 'buy');
    const sellOrders = orders.filter((o) => o.side === 'sell');

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

    return this.buildResult(
      orders.length,
      buyOrders.length,
      sellOrders.length,
      wins,
      losses,
      realizedPnl,
      dailyMap,
    );
  }

  private calculateFromSignals(
    logs: Array<{ signal: string | null; details: unknown; createdAt: Date }>,
    config: Record<string, unknown>,
  ): PerformanceResult {
    if (logs.length === 0) return this.emptyResult();

    const quantity = Number(config.quantity) || 0.001;
    let avgBuyPrice = 0;
    let buyCount = 0;
    let sellCount = 0;
    let wins = 0;
    let losses = 0;
    let realizedPnl = 0;
    let totalBuyCost = 0;
    let totalBuyQty = 0;
    const dailyMap = new Map<string, number>();

    for (const log of logs) {
      const details = log.details as Record<string, unknown>;
      const price = Number(details?.price) || 0;
      if (price <= 0) continue;

      if (log.signal === 'buy') {
        buyCount++;
        totalBuyCost += quantity * price;
        totalBuyQty += quantity;
        avgBuyPrice = totalBuyCost / totalBuyQty;
      } else if (log.signal === 'sell' && avgBuyPrice > 0) {
        sellCount++;
        const tradePnl = (price - avgBuyPrice) * quantity;
        realizedPnl += tradePnl;
        if (tradePnl > 0) wins++;
        else losses++;

        const date = log.createdAt.toISOString().split('T')[0];
        dailyMap.set(date, (dailyMap.get(date) || 0) + tradePnl);
      }
    }

    return this.buildResult(
      buyCount + sellCount,
      buyCount,
      sellCount,
      wins,
      losses,
      realizedPnl,
      dailyMap,
    );
  }

  private buildResult(
    totalTrades: number,
    buyTrades: number,
    sellTrades: number,
    wins: number,
    losses: number,
    realizedPnl: number,
    dailyMap: Map<string, number>,
  ): PerformanceResult {
    let cumulative = 0;
    const dailyPnl = Array.from(dailyMap.entries()).map(([date, pnl]) => {
      cumulative += pnl;
      return { date, pnl: Math.round(cumulative * 100) / 100 };
    });

    const totalSellTrades = wins + losses;
    return {
      totalTrades,
      buyTrades,
      sellTrades,
      wins,
      losses,
      winRate: totalSellTrades > 0 ? Math.round((wins / totalSellTrades) * 100) : 0,
      realizedPnl: Math.round(realizedPnl * 100) / 100,
      dailyPnl,
    };
  }

  private emptyResult(): PerformanceResult {
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
}
