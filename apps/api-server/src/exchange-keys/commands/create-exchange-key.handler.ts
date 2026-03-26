import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { encrypt } from '@coin/utils';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId, ExchangeCredentials } from '@coin/types';
import { CreateExchangeKeyCommand } from './create-exchange-key.command';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

@CommandHandler(CreateExchangeKeyCommand)
export class CreateExchangeKeyHandler implements ICommandHandler<CreateExchangeKeyCommand> {
  private readonly logger = new Logger(CreateExchangeKeyHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get masterKey(): string {
    return this.config.getOrThrow<string>('ENCRYPTION_MASTER_KEY');
  }

  async execute(command: CreateExchangeKeyCommand) {
    const { userId, dto } = command;

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
}
