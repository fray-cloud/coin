import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ActivityItem {
  id: string;
  type: 'order' | 'strategy_signal' | 'strategy_order' | 'risk_blocked' | 'login';
  title: string;
  description: string;
  exchange?: string;
  symbol?: string;
  status?: string;
  side?: string;
  link?: string;
  createdAt: Date;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivity(
    userId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ActivityItem[]; nextCursor: string | null }> {
    const cursorDate = cursor ? new Date(cursor) : undefined;

    // Fetch from all 3 sources in parallel
    const [orders, strategyLogs, logins] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          userId,
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.prisma.strategyLog.findMany({
        where: {
          strategy: { userId },
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
        },
        include: { strategy: { select: { name: true, exchange: true, symbol: true, id: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.prisma.loginHistory.findMany({
        where: {
          userId,
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
    ]);

    // Map to unified type
    const orderItems: ActivityItem[] = orders.map((o) => ({
      id: `order-${o.id}`,
      type: 'order' as const,
      title: `${o.side.toUpperCase()} ${o.symbol}`,
      description: `${o.type} ${o.quantity} @ ${o.filledPrice !== '0' ? o.filledPrice : o.price || 'market'} (${o.mode})`,
      exchange: o.exchange,
      symbol: o.symbol,
      status: o.status,
      side: o.side,
      link: '/orders',
      createdAt: o.createdAt,
    }));

    const strategyItems: ActivityItem[] = strategyLogs.map((log) => {
      const details = log.details as Record<string, unknown>;
      const action = log.action;
      let type: ActivityItem['type'] = 'strategy_signal';
      if (action === 'order_placed') type = 'strategy_order';
      if (action === 'risk_blocked') type = 'risk_blocked';

      return {
        id: `strategy-${log.id}`,
        type,
        title: `${log.strategy.name} — ${action.replace('_', ' ')}`,
        description: log.signal
          ? `${log.signal.toUpperCase()} @ ${details.price || ''} (${details.reason || ''})`
          : String(details.reason || details.error || ''),
        exchange: log.strategy.exchange,
        symbol: log.strategy.symbol,
        side: log.signal || undefined,
        link: `/strategies/${log.strategy.id}`,
        createdAt: log.createdAt,
      };
    });

    const loginItems: ActivityItem[] = logins.map((l) => ({
      id: `login-${l.id}`,
      type: 'login' as const,
      title: `로그인 (${l.method})`,
      description: l.ip ? `IP: ${l.ip}` : '',
      link: '/activity',
      createdAt: l.createdAt,
    }));

    // Merge sort by createdAt desc
    const all = [...orderItems, ...strategyItems, ...loginItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const hasMore = all.length > limit;
    const items = all.slice(0, limit);
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;

    return { items, nextCursor };
  }
}
