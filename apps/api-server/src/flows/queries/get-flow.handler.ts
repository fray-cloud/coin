import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GetFlowQuery } from './get-flow.query';

@QueryHandler(GetFlowQuery)
export class GetFlowHandler implements IQueryHandler<GetFlowQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetFlowQuery) {
    const flow = await this.prisma.flow.findFirst({
      where: { id: query.id, userId: query.userId },
      include: {
        backtests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
            summary: true,
            createdAt: true,
          },
        },
      },
    });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }
}
