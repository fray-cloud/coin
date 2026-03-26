import { Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderRequestedEvent } from '@coin/kafka-contracts';
import type { ExchangeId } from '@coin/types';
import type { SagaStep } from '../../saga/saga-step.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface OrderLifecycleContext {
  userId: string;
  exchange: string;
  symbol: string;
  side: string;
  type: string;
  mode: string;
  quantity: string;
  price?: string;
  exchangeKeyId?: string;
  orderId?: string;
  requestId?: string;
}

export class CreateOrderStep implements SagaStep<OrderLifecycleContext> {
  readonly name = 'CreateOrder';
  private readonly logger = new Logger(CreateOrderStep.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(context: OrderLifecycleContext): Promise<OrderLifecycleContext> {
    const order = await this.prisma.order.create({
      data: {
        userId: context.userId,
        exchangeKeyId: context.mode === 'real' ? context.exchangeKeyId || null : null,
        exchange: context.exchange,
        symbol: context.symbol,
        side: context.side,
        type: context.type,
        mode: context.mode,
        status: 'pending',
        quantity: context.quantity,
        price: context.price || null,
      },
    });

    this.logger.log(`Order created: ${order.id}`);
    return { ...context, orderId: order.id };
  }

  async compensate(context: OrderLifecycleContext): Promise<void> {
    if (context.orderId) {
      await this.prisma.order.update({
        where: { id: context.orderId },
        data: { status: 'failed' },
      });
      this.logger.log(`Order marked failed: ${context.orderId}`);
    }
  }
}

export class PublishOrderRequestStep implements SagaStep<OrderLifecycleContext> {
  readonly name = 'PublishOrderRequest';
  private readonly logger = new Logger(PublishOrderRequestStep.name);

  constructor(private readonly producer: Producer) {}

  async execute(context: OrderLifecycleContext): Promise<OrderLifecycleContext> {
    const requestId = randomUUID();

    const event: OrderRequestedEvent = {
      requestId,
      userId: context.userId,
      exchangeKeyId: context.exchangeKeyId || '',
      order: {
        exchange: context.exchange as ExchangeId,
        symbol: context.symbol,
        side: context.side as 'buy' | 'sell',
        type: context.type as 'limit' | 'market',
        quantity: context.quantity,
        price: context.price,
      },
      mode: context.mode as 'paper' | 'real',
      dbOrderId: context.orderId!,
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
      messages: [{ key: context.userId, value: JSON.stringify(event) }],
    });

    this.logger.log(`Order request published: ${requestId}`);
    return { ...context, requestId };
  }

  async compensate(_context: OrderLifecycleContext): Promise<void> {
    // noop — Kafka message already sent, worker will handle idempotency
  }
}
