import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { DeleteStrategyCommand } from './delete-strategy.command';

@CommandHandler(DeleteStrategyCommand)
export class DeleteStrategyHandler implements ICommandHandler<DeleteStrategyCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteStrategyCommand) {
    const { userId, id } = command;

    const strategy = await this.prisma.strategy.findFirst({
      where: { id, userId },
    });
    if (!strategy) throw new NotFoundException('Strategy not found');

    await this.prisma.strategy.delete({ where: { id } });
    return { id, deleted: true };
  }
}
