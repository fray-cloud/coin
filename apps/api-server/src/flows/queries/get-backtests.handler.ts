import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetBacktestsQuery } from './get-backtests.query';

@QueryHandler(GetBacktestsQuery)
export class GetBacktestsHandler implements IQueryHandler<GetBacktestsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBacktestsQuery) {
    const flow = await this.prisma.flow.findFirst({
      where: { id: query.flowId, userId: query.userId },
      select: { id: true },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    return this.prisma.backtest.findMany({
      where: { flowId: query.flowId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
