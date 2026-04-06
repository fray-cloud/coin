import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { ReorderStrategiesCommand } from './reorder-strategies.command';

@CommandHandler(ReorderStrategiesCommand)
export class ReorderStrategiesHandler implements ICommandHandler<ReorderStrategiesCommand> {
  private readonly logger = new Logger(ReorderStrategiesHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReorderStrategiesCommand): Promise<void> {
    const { userId, dto } = command;

    if (!dto.orders.length) return;

    const ids = dto.orders.map((o) => o.id);
    const owned = await this.prisma.strategy.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true },
    });

    if (owned.length !== ids.length) {
      throw new BadRequestException('One or more strategy IDs are invalid or not owned by user');
    }

    await this.prisma.$transaction(
      dto.orders.map(({ id, order }) =>
        this.prisma.strategy.update({ where: { id }, data: { order } }),
      ),
    );

    this.logger.log(`Reordered ${dto.orders.length} strategies for user ${userId}`);
  }
}
