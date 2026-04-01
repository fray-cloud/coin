import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeleteFlowCommand } from './delete-flow.command';

@CommandHandler(DeleteFlowCommand)
export class DeleteFlowHandler implements ICommandHandler<DeleteFlowCommand> {
  private readonly logger = new Logger(DeleteFlowHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteFlowCommand) {
    const { userId, id } = command;

    const flow = await this.prisma.flow.findFirst({
      where: { id, userId },
    });
    if (!flow) throw new NotFoundException('Flow not found');

    await this.prisma.flow.delete({ where: { id } });

    this.logger.log(`Flow deleted: ${id}`);
    return { success: true };
  }
}
