import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { DeleteExchangeKeyCommand } from './delete-exchange-key.command';

@CommandHandler(DeleteExchangeKeyCommand)
export class DeleteExchangeKeyHandler implements ICommandHandler<DeleteExchangeKeyCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteExchangeKeyCommand) {
    const { userId, id } = command;

    const key = await this.prisma.exchangeKey.findFirst({
      where: { id, userId },
    });
    if (!key) throw new NotFoundException('Exchange key not found');

    await this.prisma.exchangeKey.delete({ where: { id } });
    return { message: 'Deleted' };
  }
}
