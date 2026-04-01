import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetFlowsQuery } from './get-flows.query';

@QueryHandler(GetFlowsQuery)
export class GetFlowsHandler implements IQueryHandler<GetFlowsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetFlowsQuery) {
    return this.prisma.flow.findMany({
      where: { userId: query.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        backtests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            summary: true,
            createdAt: true,
          },
        },
      },
    });
  }
}
