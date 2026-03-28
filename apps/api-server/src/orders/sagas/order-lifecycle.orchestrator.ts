import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';

interface NotificationEvent {
  userId: string;
  type: string;
  title: string;
  message: string;
}
import { PrismaService } from '../../prisma/prisma.service';
import { SagaStepRunner } from '../../saga/saga-step-runner';
import { CreateOrderDto } from '../dto/create-order.dto';
import {
  CreateOrderStep,
  PublishOrderRequestStep,
  type OrderLifecycleContext,
} from './order-lifecycle-steps';

@Injectable()
export class OrderLifecycleOrchestrator implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderLifecycleOrchestrator.name);
  private kafka: Kafka;
  private producer: Producer;
  private connected = false;

  constructor(private readonly prisma: PrismaService) {
    this.kafka = new Kafka({
      clientId: 'api-orders-saga',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.connected = true;
    this.logger.log('OrderLifecycleOrchestrator Kafka producer connected');
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.producer.disconnect();
    }
  }

  async startSaga(userId: string, dto: CreateOrderDto): Promise<{ id: string; status: string }> {
    const initialContext: OrderLifecycleContext = {
      userId,
      exchange: dto.exchange,
      symbol: dto.symbol,
      side: dto.side,
      type: dto.type,
      mode: dto.mode,
      quantity: dto.quantity,
      price: dto.price,
      exchangeKeyId: dto.exchangeKeyId,
    };

    const runner = new SagaStepRunner<OrderLifecycleContext>(this.prisma);
    runner
      .addStep(new CreateOrderStep(this.prisma))
      .addStep(new PublishOrderRequestStep(this.producer));

    const correlationId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await runner.run(initialContext, {
      sagaType: 'order-lifecycle',
      correlationId,
      userId,
      timeoutMs: 60_000,
    });

    // After runner completes both steps, set saga to awaiting_worker
    await this.prisma.sagaExecution.update({
      where: { correlationId },
      data: { status: 'awaiting_worker' },
    });

    this.logger.log(`Saga started: ${correlationId} for order ${result.orderId}`);
    return { id: result.orderId!, status: 'pending' };
  }

  async onWorkerResult(requestId: string, result: { status: string }): Promise<void> {
    const saga = await this.prisma.sagaExecution.findFirst({
      where: {
        sagaType: 'order-lifecycle',
        status: 'awaiting_worker',
      },
    });

    if (!saga) {
      this.logger.warn(`No awaiting saga found for requestId: ${requestId}`);
      return;
    }

    // Match by requestId in context
    const context = saga.context as unknown as OrderLifecycleContext;
    if (context.requestId !== requestId) {
      // Search more broadly
      const allAwaiting = await this.prisma.sagaExecution.findMany({
        where: { sagaType: 'order-lifecycle', status: 'awaiting_worker' },
      });

      const matched = allAwaiting.find((s) => {
        const ctx = s.context as unknown as OrderLifecycleContext;
        return ctx.requestId === requestId;
      });

      if (!matched) {
        this.logger.warn(`No saga matched for requestId: ${requestId}`);
        return;
      }

      await this.prisma.sagaExecution.update({
        where: { id: matched.id },
        data: {
          status: result.status === 'failed' ? 'failed' : 'completed',
        },
      });

      this.logger.log(`Saga completed: ${matched.correlationId} → ${result.status}`);
      return;
    }

    await this.prisma.sagaExecution.update({
      where: { id: saga.id },
      data: {
        status: result.status === 'failed' ? 'failed' : 'completed',
      },
    });

    this.logger.log(`Saga completed: ${saga.correlationId} → ${result.status}`);
  }

  async handleTimeouts(): Promise<void> {
    const now = new Date();

    const expired = await this.prisma.sagaExecution.findMany({
      where: {
        sagaType: 'order-lifecycle',
        status: 'awaiting_worker',
        expiresAt: { lt: now },
      },
    });

    for (const saga of expired) {
      const context = saga.context as unknown as OrderLifecycleContext;

      await this.prisma.sagaExecution.update({
        where: { id: saga.id },
        data: { status: 'timed_out', error: 'Worker response timeout' },
      });

      if (context.orderId) {
        await this.prisma.order.update({
          where: { id: context.orderId },
          data: { status: 'failed' },
        });
      }

      const notif: NotificationEvent = {
        userId: saga.userId,
        type: 'order_failed',
        title: `주문 타임아웃 | ${context.exchange.toUpperCase()} ${context.symbol}`,
        message: `${context.side.toUpperCase()} ${context.quantity} — Worker 응답 없음`,
      };

      await this.producer.send({
        topic: KAFKA_TOPICS.NOTIFICATION_SEND,
        messages: [{ key: saga.userId, value: JSON.stringify(notif) }],
      });

      this.logger.warn(`Saga timed out: ${saga.correlationId}`);
    }
  }
}
