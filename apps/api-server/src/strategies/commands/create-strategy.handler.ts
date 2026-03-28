import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStrategyCommand } from './create-strategy.command';

@CommandHandler(CreateStrategyCommand)
export class CreateStrategyHandler implements ICommandHandler<CreateStrategyCommand> {
  private readonly logger = new Logger(CreateStrategyHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateStrategyCommand): Promise<unknown> {
    const { userId, dto } = command;

    if (dto.tradingMode === 'real' && !dto.exchangeKeyId) {
      throw new BadRequestException('exchangeKeyId is required for real trading mode');
    }

    if (dto.tradingMode === 'real' && dto.exchangeKeyId) {
      const key = await this.prisma.exchangeKey.findFirst({
        where: { id: dto.exchangeKeyId, userId },
      });
      if (!key) throw new NotFoundException('Exchange key not found');
    }

    const strategy = await this.prisma.strategy.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        exchange: dto.exchange,
        symbol: dto.symbol,
        mode: dto.mode,
        tradingMode: dto.tradingMode,
        exchangeKeyId: dto.tradingMode === 'real' ? dto.exchangeKeyId : null,
        config: dto.config as never,
        riskConfig: (dto.riskConfig || {}) as never,
        intervalSeconds: dto.intervalSeconds || 60,
        candleInterval: dto.candleInterval || '1h',
      },
    });

    this.logger.log(`Strategy created: ${strategy.id} (${dto.name})`);
    return strategy;
  }
}
