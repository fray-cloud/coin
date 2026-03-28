import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetExchangeKeysQuery } from './get-exchange-keys.query';

@QueryHandler(GetExchangeKeysQuery)
export class GetExchangeKeysHandler implements IQueryHandler<GetExchangeKeysQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetExchangeKeysQuery) {
    return this.prisma.exchangeKey.findMany({
      where: { userId: query.userId },
      select: {
        id: true,
        exchange: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
