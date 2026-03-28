import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetStrategySignalsQuery } from './get-strategy-signals.query';

interface StrategySignal {
  signal: string;
  action: string;
  price: number;
  createdAt: string;
}

@QueryHandler(GetStrategySignalsQuery)
export class GetStrategySignalsHandler implements IQueryHandler<GetStrategySignalsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetStrategySignalsQuery): Promise<StrategySignal[]> {
    const { userId, strategyId } = query;

    const strategy = await this.prisma.strategy.findFirst({
      where: { id: strategyId, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    const logs = await this.prisma.strategyLog.findMany({
      where: {
        strategyId,
        action: { in: ['signal_generated', 'order_placed'] },
        signal: { not: null },
      },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });

    return logs.map((log) => {
      const details = log.details as Record<string, unknown>;
      return {
        signal: log.signal!,
        action: log.action,
        price: Number(details?.price) || 0,
        createdAt: log.createdAt.toISOString(),
      };
    });
  }
}
