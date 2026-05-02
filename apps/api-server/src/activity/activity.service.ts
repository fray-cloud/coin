import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ActivityItem {
  id: string;
  type: 'order' | 'login';
  title: string;
  description: string;
  exchange?: string;
  symbol?: string;
  status?: string;
  side?: string;
  link?: string;
  createdAt: Date;
}

function formatCloseReason(reason: string): string {
  switch (reason) {
    case 'take_profit':
      return 'TP 익절';
    case 'stop_loss':
      return 'SL 손절';
    case 'liquidation':
      return '청산';
    case 'manual':
      return '수동 종료';
    case 'manual_on_exchange':
      return '거래소에서 종료';
    case 'reconciled_unknown':
      return '동기화';
    default:
      return reason;
  }
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

    const [orders, logins] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          userId,
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
        },
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

    const orderItems: ActivityItem[] = orders.map((o) => {
      const reasonSuffix = o.closeReason ? ` · ${formatCloseReason(o.closeReason)}` : '';
      return {
        id: `order-${o.id}`,
        type: 'order' as const,
        title: `${o.side.toUpperCase()} ${o.symbol}`,
        description: `${o.type} ${o.quantity} @ ${o.filledPrice !== '0' ? o.filledPrice : o.price || 'market'} (${o.mode})${reasonSuffix}`,
        exchange: o.exchange,
        symbol: o.symbol,
        status: o.closedAt ? 'closed' : o.status,
        side: o.side,
        link: `/orders/${o.id}`,
        createdAt: o.createdAt,
      };
    });

    const loginItems: ActivityItem[] = logins.map((l) => ({
      id: `login-${l.id}`,
      type: 'login' as const,
      title: l.method === 'logout' ? '로그아웃' : `로그인 (${l.method})`,
      description: l.ip ? `IP: ${l.ip}` : '',
      side: l.method === 'logout' ? 'logout' : undefined,
      link: '/activity',
      createdAt: l.createdAt,
    }));

    const all = [...orderItems, ...loginItems].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const hasMore = all.length > limit;
    const items = all.slice(0, limit);
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;

    return { items, nextCursor };
  }
}
