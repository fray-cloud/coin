import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId } from '@coin/types';
import { GetMarketsQuery } from './get-markets.query';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

@QueryHandler(GetMarketsQuery)
export class GetMarketsHandler implements IQueryHandler<GetMarketsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMarketsQuery) {
    const { userId, exchangeKeyId } = query;

    const key = await this.prisma.exchangeKey.findFirst({
      where: { id: exchangeKeyId, userId },
    });
    if (!key) throw new NotFoundException('Exchange key not found');

    const adapter = REST_ADAPTERS[key.exchange as ExchangeId]();
    return adapter.getMarkets();
  }
}
