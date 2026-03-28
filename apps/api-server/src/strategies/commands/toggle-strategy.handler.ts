import { Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { ToggleStrategyCommand } from './toggle-strategy.command';

@CommandHandler(ToggleStrategyCommand)
export class ToggleStrategyHandler implements ICommandHandler<ToggleStrategyCommand> {
  private readonly logger = new Logger(ToggleStrategyHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ToggleStrategyCommand) {
    const { userId, id } = command;

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
}
