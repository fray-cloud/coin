import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetStrategyLogsQuery } from './get-strategy-logs.query';

@QueryHandler(GetStrategyLogsQuery)
export class GetStrategyLogsHandler implements IQueryHandler<GetStrategyLogsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetStrategyLogsQuery,
  ): Promise<{ items: unknown[]; nextCursor: string | null }> {
    const { userId, strategyId, cursor, limit } = query;

    const strategy = await this.prisma.strategy.findFirst({
      where: { id: strategyId, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    const logs = await this.prisma.strategyLog.findMany({
      where: {
        strategyId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return { items, nextCursor };
  }
}
