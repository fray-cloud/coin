import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderRequestedEvent } from '@coin/kafka-contracts';
import type { ExchangeId, OrderRequest } from '@coin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderCommand } from './create-order.command';
import { randomUUID } from 'crypto';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  private readonly logger = new Logger(CreateOrderHandler.name);
  private kafka: Kafka;
  private producer: Producer;
  private connected = false;

  constructor(private readonly prisma: PrismaService) {
    this.kafka = new Kafka({
      clientId: 'api-orders',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
  }

  private async ensureConnected() {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }
  }

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

    const order = await this.prisma.order.create({
      data: {
        userId,
        exchangeKeyId: dto.mode === 'real' ? dto.exchangeKeyId : null,
        exchange: dto.exchange,
        symbol: dto.symbol,
        side: dto.side,
        type: dto.type,
        mode: dto.mode,
        status: 'pending',
        quantity: dto.quantity,
        price: dto.price || null,
      },
    });

    const orderRequest: OrderRequest = {
      exchange: dto.exchange as ExchangeId,
      symbol: dto.symbol,
      side: dto.side as 'buy' | 'sell',
      type: dto.type as 'limit' | 'market',
      quantity: dto.quantity,
      price: dto.price,
    };

    const event: OrderRequestedEvent = {
      requestId: randomUUID(),
      userId,
      exchangeKeyId: dto.exchangeKeyId || '',
      order: orderRequest,
      mode: dto.mode as 'paper' | 'real',
      dbOrderId: order.id,
    };

    await this.ensureConnected();
    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
      messages: [{ key: userId, value: JSON.stringify(event) }],
    });

    this.logger.log(`Order submitted: ${order.id} (${dto.mode} ${dto.side} ${dto.symbol})`);
    return { id: order.id, status: 'pending' };
  }
}
