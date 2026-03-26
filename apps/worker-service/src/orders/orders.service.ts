import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderRequestedEvent, OrderResultEvent } from '@coin/kafka-contracts';
import type { OrderResult } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';
import { PaperEngineService } from './paper-engine.service';
import { executeRealOrderSaga } from './sagas/real-execution-steps';

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paperEngine: PaperEngineService,
  ) {
    this.kafka = new Kafka({
      clientId: 'worker-orders',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.consumer = this.kafka.consumer({ groupId: 'worker-orders-group' });
    this.producer = this.kafka.producer();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event: OrderRequestedEvent = JSON.parse(message.value!.toString());
          await this.handleOrderRequested(event);
        } catch (err) {
          this.logger.error(`Failed to process order request: ${err}`);
        }
      },
    });

    this.logger.log('Order consumer started');
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    await this.producer.disconnect();
    this.redis.disconnect();
  }

  getProducer(): Producer {
    return this.producer;
  }

  private async handleOrderRequested(event: OrderRequestedEvent) {
    const { mode, order, dbOrderId, userId, exchangeKeyId } = event;

    // Idempotency check
    const lockKey = `saga:lock:${event.requestId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 60, 'NX');
    if (!acquired) {
      this.logger.warn(`Duplicate: ${event.requestId}`);
      return;
    }

    this.logger.log(`Order requested: ${dbOrderId} (${mode} ${order.side} ${order.symbol})`);

    try {
      if (mode === 'paper') {
        await this.executePaperOrder(event);
      } else {
        await this.executeRealOrder(event);
      }
    } catch (err) {
      this.logger.error(`Order execution failed: ${dbOrderId} - ${err}`);

      await this.prisma.order.update({
        where: { id: dbOrderId },
        data: { status: 'failed' },
      });

      const failResult: OrderResult = {
        exchange: order.exchange,
        orderId: '',
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        status: 'failed',
        quantity: order.quantity,
        filledQuantity: '0',
        price: order.price || '0',
        filledPrice: '0',
        fee: '0',
        feeCurrency: '',
        timestamp: Date.now(),
      };

      const resultEvent: OrderResultEvent = {
        requestId: event.requestId,
        userId,
        dbOrderId,
        result: failResult,
        mode,
      };

      await this.producer.send({
        topic: KAFKA_TOPICS.TRADING_ORDER_RESULT,
        messages: [{ key: userId, value: JSON.stringify(resultEvent) }],
      });
    }
  }

  private async executePaperOrder(event: OrderRequestedEvent) {
    const { order, dbOrderId, userId } = event;

    if (order.type === 'market') {
      await this.paperEngine.executeMarketOrder(
        dbOrderId,
        userId,
        order.exchange,
        order.symbol,
        order.side,
        order.quantity,
        this.redis,
        this.producer,
      );
    } else {
      await this.paperEngine.placeLimitOrder(
        dbOrderId,
        userId,
        order.exchange,
        order.symbol,
        order.side,
        order.quantity,
        order.price || '0',
        this.redis,
        this.producer,
      );
    }
  }

  private async executeRealOrder(event: OrderRequestedEvent) {
    await executeRealOrderSaga(event, this.prisma, this.producer);
    this.logger.log(`Real order executed via saga: ${event.dbOrderId}`);
  }
}
