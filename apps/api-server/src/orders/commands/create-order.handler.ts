import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderLifecycleOrchestrator } from '../sagas/order-lifecycle.orchestrator';
import { CreateOrderCommand } from './create-order.command';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  private readonly logger = new Logger(CreateOrderHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: OrderLifecycleOrchestrator,
  ) {}

  async execute(command: CreateOrderCommand) {
    const { userId, dto } = command;

    if (dto.mode === 'real' && !dto.exchangeKeyId) {
      throw new BadRequestException('exchangeKeyId is required for real trading');
    }

    dto.quantity = dto.quantity.replace(/,/g, '');
    if (dto.price) dto.price = dto.price.replace(/,/g, '');

    if (dto.type === 'limit' && !dto.price) {
      throw new BadRequestException('price is required for limit orders');
    }

    if (dto.mode === 'real' && dto.exchangeKeyId) {
      const key = await this.prisma.exchangeKey.findFirst({
        where: { id: dto.exchangeKeyId, userId },
      });
      if (!key) throw new NotFoundException('Exchange key not found');
    }

    const result = await this.orchestrator.startSaga(userId, dto);

    this.logger.log(
      `Order submitted via saga: ${result.id} (${dto.mode} ${dto.side} ${dto.symbol})`,
    );
    return result;
  }
}
