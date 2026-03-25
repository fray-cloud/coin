import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@Injectable()
export class StrategiesService {
  private readonly logger = new Logger(StrategiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createStrategy(userId: string, dto: CreateStrategyDto) {
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
        config: dto.config,
        riskConfig: dto.riskConfig || {},
        intervalSeconds: dto.intervalSeconds || 60,
      },
    });

    this.logger.log(`Strategy created: ${strategy.id} (${dto.name})`);
    return strategy;
  }

  async getStrategies(userId: string) {
    return this.prisma.strategy.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStrategy(userId: string, id: string) {
    const strategy = await this.prisma.strategy.findFirst({
      where: { id, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');
    return strategy;
  }

  async updateStrategy(userId: string, id: string, dto: UpdateStrategyDto) {
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

    return this.prisma.strategy.update({
      where: { id },
      data,
    });
  }

  async toggleStrategy(userId: string, id: string) {
    const strategy = await this.prisma.strategy.findFirst({
      where: { id, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    const updated = await this.prisma.strategy.update({
      where: { id },
      data: { enabled: !strategy.enabled },
    });

    this.logger.log(`Strategy ${id} ${updated.enabled ? 'enabled' : 'disabled'}`);
    return { id, enabled: updated.enabled };
  }

  async deleteStrategy(userId: string, id: string) {
    const strategy = await this.prisma.strategy.findFirst({
      where: { id, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    await this.prisma.strategy.delete({ where: { id } });
    return { id, deleted: true };
  }

  async getStrategyLogs(
    userId: string,
    strategyId: string,
    cursor?: string,
    limit = 20,
  ): Promise<{ items: unknown[]; nextCursor: string | null }> {
    // Verify ownership
    const strategy = await this.prisma.strategy.findFirst({
      where: { id: strategyId, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    const logs = await this.prisma.strategyLog.findMany({
      where: {
        strategyId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return { items, nextCursor };
  }
}
