import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ToggleFlowCommand } from './toggle-flow.command';

@CommandHandler(ToggleFlowCommand)
export class ToggleFlowHandler implements ICommandHandler<ToggleFlowCommand> {
  private readonly logger = new Logger(ToggleFlowHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ToggleFlowCommand) {
    const { userId, id } = command;

    const flow = await this.prisma.flow.findFirst({
      where: { id, userId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    const updated = await this.prisma.flow.update({
      where: { id },
      data: { enabled: !flow.enabled },
    });

    this.logger.log(`Flow toggled: ${id} → ${updated.enabled ? 'enabled' : 'disabled'}`);
    return updated;
  }
}
