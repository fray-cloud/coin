import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '@coin/utils';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId, ExchangeCredentials } from '@coin/types';
import { CreateExchangeKeyDto } from './dto/create-exchange-key.dto';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

@Injectable()
export class ExchangeKeysService {
  private readonly logger = new Logger(ExchangeKeysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get masterKey(): string {
    return this.config.getOrThrow<string>('ENCRYPTION_MASTER_KEY');
  }

  async create(userId: string, dto: CreateExchangeKeyDto) {
    const credentials: ExchangeCredentials = {
      apiKey: dto.apiKey,
      secretKey: dto.secretKey,
    };

    // Validate key by calling getBalances
    const adapter = REST_ADAPTERS[dto.exchange as ExchangeId]();
    try {
      await adapter.getBalances(credentials);
    } catch (err) {
      this.logger.warn(`Exchange key validation failed: ${err}`);
      throw new BadRequestException(
        'Exchange API authentication failed. Please check your API key and secret.',
      );
    }

    const exchangeKey = await this.prisma.exchangeKey.upsert({
      where: {
        userId_exchange: { userId, exchange: dto.exchange },
      },
      update: {
        apiKey: encrypt(dto.apiKey, this.masterKey),
        secretKey: encrypt(dto.secretKey, this.masterKey),
      },
      create: {
        userId,
        exchange: dto.exchange,
        apiKey: encrypt(dto.apiKey, this.masterKey),
        secretKey: encrypt(dto.secretKey, this.masterKey),
      },
    });

    return {
      id: exchangeKey.id,
      exchange: exchangeKey.exchange,
      createdAt: exchangeKey.createdAt,
    };
  }

  async findAll(userId: string) {
    return this.prisma.exchangeKey.findMany({
      where: { userId },
      select: {
        id: true,
        exchange: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(userId: string, id: string) {
    const key = await this.prisma.exchangeKey.findFirst({
      where: { id, userId },
    });
    if (!key) throw new NotFoundException('Exchange key not found');

    await this.prisma.exchangeKey.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  async getBalances(userId: string, id: string) {
    const { adapter, credentials } = await this.getAdapterWithCredentials(userId, id);
    return adapter.getBalances(credentials);
  }

  async getOpenOrders(userId: string, id: string, symbol?: string) {
    const { adapter, credentials } = await this.getAdapterWithCredentials(userId, id);
    return adapter.getOpenOrders(credentials, symbol);
  }

  async getMarkets(userId: string, id: string) {
    const key = await this.prisma.exchangeKey.findFirst({
      where: { id, userId },
    });
    if (!key) throw new NotFoundException('Exchange key not found');

    const adapter = REST_ADAPTERS[key.exchange as ExchangeId]();
    return adapter.getMarkets();
  }

  private async getAdapterWithCredentials(userId: string, id: string) {
    const key = await this.prisma.exchangeKey.findFirst({
      where: { id, userId },
    });
    if (!key) throw new NotFoundException('Exchange key not found');

    const adapter = REST_ADAPTERS[key.exchange as ExchangeId]();
    const credentials: ExchangeCredentials = {
      apiKey: decrypt(key.apiKey, this.masterKey),
      secretKey: decrypt(key.secretKey, this.masterKey),
    };

    return { adapter, credentials };
  }
}
