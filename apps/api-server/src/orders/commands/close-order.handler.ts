import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Kafka, Producer } from 'kafkajs';
import { randomUUID } from 'crypto';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderCloseRequestedEvent } from '@coin/kafka-contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { CloseOrderCommand } from './close-order.command';

@Injectable()
@CommandHandler(CloseOrderCommand)
export class CloseOrderHandler
  implements ICommandHandler<CloseOrderCommand>, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CloseOrderHandler.name);
  private kafka: Kafka;
  private producer: Producer;
  private connected = false;

  constructor(private readonly prisma: PrismaService) {
    this.kafka = new Kafka({
      clientId: 'api-orders-close',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.connected = true;
  }

  async onModuleDestroy() {
    if (this.connected) await this.producer.disconnect();
  }

  async execute(command: CloseOrderCommand) {
    const { userId, orderId } = command;

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.mode !== 'real') {
      throw new BadRequestException('Only real-mode positions can be manually closed');
    }
    if (order.status !== 'filled') {
      throw new BadRequestException(`Cannot close order with status: ${order.status}`);
    }
    if (order.closedAt) {
      throw new BadRequestException('Position is already closed');
    }
    if (!order.exchangeKeyId) {
      throw new BadRequestException('Order missing exchange key — cannot close');
    }

    const requestId = randomUUID();
    const event: OrderCloseRequestedEvent = {
      requestId,
      userId,
      dbOrderId: orderId,
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_CLOSE_REQUESTED,
      messages: [{ key: userId, value: JSON.stringify(event) }],
    });

    this.logger.log(`Close requested: ${orderId} (requestId=${requestId})`);
    return { id: orderId, status: 'pending' };
  }
}
