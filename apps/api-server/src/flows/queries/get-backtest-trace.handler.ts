import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetBacktestTraceQuery } from './get-backtest-trace.query';

@QueryHandler(GetBacktestTraceQuery)
export class GetBacktestTraceHandler implements IQueryHandler<GetBacktestTraceQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBacktestTraceQuery) {
    // Verify ownership via flow
    const flow = await this.prisma.flow.findFirst({
      where: { id: query.flowId, userId: query.userId },
      select: { id: true },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    const backtest = await this.prisma.backtest.findFirst({
      where: { id: query.backtestId, flowId: query.flowId },
      select: { id: true },
    });
    if (!backtest) throw new NotFoundException('Backtest not found');

    const timestampFilter: Record<string, Date> = {};
    if (query.from) timestampFilter.gte = new Date(query.from);
    if (query.to) timestampFilter.lte = new Date(query.to);

    const where = {
      backtestId: query.backtestId,
      ...(Object.keys(timestampFilter).length > 0 && {
        timestamp: timestampFilter,
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.backtestTrace.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        take: query.limit || 100,
        skip: query.offset || 0,
      }),
      this.prisma.backtestTrace.count({ where }),
    ]);

    return { items, total };
  }
}
