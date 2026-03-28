import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetOrdersQuery } from './get-orders.query';

@QueryHandler(GetOrdersQuery)
export class GetOrdersHandler implements IQueryHandler<GetOrdersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrdersQuery) {
    const { userId, cursor, limit, status, exchange, symbol, mode, side } = query;

    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
        ...(status ? { status } : {}),
        ...(exchange ? { exchange } : {}),
        ...(symbol ? { symbol } : {}),
        ...(mode ? { mode } : {}),
        ...(side ? { side } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return { items, nextCursor };
  }
}
