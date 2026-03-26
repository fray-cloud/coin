import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { decrypt } from '@coin/utils';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId, ExchangeCredentials } from '@coin/types';
import { GetBalancesQuery } from './get-balances.query';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

@QueryHandler(GetBalancesQuery)
export class GetBalancesHandler implements IQueryHandler<GetBalancesQuery> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get masterKey(): string {
    return this.config.getOrThrow<string>('ENCRYPTION_MASTER_KEY');
  }

  async execute(query: GetBalancesQuery) {
    const { userId, exchangeKeyId } = query;

    const key = await this.prisma.exchangeKey.findFirst({
      where: { id: exchangeKeyId, userId },
    });
    if (!key) throw new NotFoundException('Exchange key not found');

    const adapter = REST_ADAPTERS[key.exchange as ExchangeId]();
    const credentials: ExchangeCredentials = {
      apiKey: decrypt(key.apiKey, this.masterKey),
      secretKey: decrypt(key.secretKey, this.masterKey),
    };

    return adapter.getBalances(credentials);
  }
}
