import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateStrategyCommand } from './update-strategy.command';

@CommandHandler(UpdateStrategyCommand)
export class UpdateStrategyHandler implements ICommandHandler<UpdateStrategyCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: UpdateStrategyCommand): Promise<unknown> {
    const { userId, id, dto } = command;

    const strategy = await this.prisma.strategy.findFirst({
      where: { id, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    if (dto.tradingMode === 'real' && dto.exchangeKeyId) {
      const key = await this.prisma.exchangeKey.findFirst({
        where: { id: dto.exchangeKeyId, userId },
      });
      if (!key) throw new NotFoundException('Exchange key not found');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.mode !== undefined) data.mode = dto.mode;
    if (dto.tradingMode !== undefined) data.tradingMode = dto.tradingMode;
    if (dto.exchangeKeyId !== undefined) data.exchangeKeyId = dto.exchangeKeyId;
    if (dto.config !== undefined) data.config = dto.config;
    if (dto.riskConfig !== undefined) data.riskConfig = dto.riskConfig;
    if (dto.intervalSeconds !== undefined) data.intervalSeconds = dto.intervalSeconds;
    if (dto.candleInterval !== undefined) data.candleInterval = dto.candleInterval;

    return this.prisma.strategy.update({
      where: { id },
      data,
    });
  }
}
