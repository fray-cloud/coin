import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetStrategiesQuery } from './get-strategies.query';

@QueryHandler(GetStrategiesQuery)
export class GetStrategiesHandler implements IQueryHandler<GetStrategiesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStrategiesQuery): Promise<unknown[]> {
    return this.prisma.strategy.findMany({
      where: { userId: query.userId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
