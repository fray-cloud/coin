import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestBacktestCommand } from './request-backtest.command';
import { FLOW_LIMITS } from '@coin/types';
import { FlowsKafkaProducer } from '../flows-kafka.producer';

@CommandHandler(RequestBacktestCommand)
export class RequestBacktestHandler implements ICommandHandler<RequestBacktestCommand> {
  private readonly logger = new Logger(RequestBacktestHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kafkaProducer: FlowsKafkaProducer,
  ) {}

  async execute(command: RequestBacktestCommand) {
    const { userId, flowId, dto } = command;

    const flow = await this.prisma.flow.findFirst({
      where: { id: flowId, userId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays <= 0) {
      throw new BadRequestException('endDate must be after startDate');
    }
    if (diffDays > FLOW_LIMITS.MAX_BACKTEST_DAYS) {
      throw new BadRequestException(
        `Maximum backtest range is ${FLOW_LIMITS.MAX_BACKTEST_DAYS} days`,
      );
    }

    // Enforce max backtests per flow — prune oldest if at limit
    const existingCount = await this.prisma.backtest.count({
      where: { flowId },
    });
    if (existingCount >= FLOW_LIMITS.MAX_BACKTESTS_PER_FLOW) {
      const oldest = await this.prisma.backtest.findMany({
        where: { flowId },
        orderBy: { createdAt: 'asc' },
        take: existingCount - FLOW_LIMITS.MAX_BACKTESTS_PER_FLOW + 1,
        select: { id: true },
      });
      await this.prisma.backtest.deleteMany({
        where: { id: { in: oldest.map((b) => b.id) } },
      });
    }

    const backtest = await this.prisma.backtest.create({
      data: {
        flowId,
        startDate,
        endDate,
        status: 'pending',
      },
    });

    await this.kafkaProducer.publishBacktestRequested({
      backtestId: backtest.id,
      flowId,
      userId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    this.logger.log(`Backtest requested: ${backtest.id} for flow ${flowId}`);
    return { backtestId: backtest.id };
  }
}
