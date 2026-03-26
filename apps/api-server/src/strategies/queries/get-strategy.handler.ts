import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetStrategyQuery } from './get-strategy.query';

@QueryHandler(GetStrategyQuery)
export class GetStrategyHandler implements IQueryHandler<GetStrategyQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStrategyQuery): Promise<unknown> {
    const strategy = await this.prisma.strategy.findFirst({
      where: { id: query.id, userId: query.userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');
    return strategy;
  }
}
