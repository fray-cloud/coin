import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type {
  OrderRequestedEvent,
  OrderResultEvent,
  OrderCloseRequestedEvent,
} from '@coin/kafka-contracts';
import type { OrderResult } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';
import { executeRealOrderSaga } from './sagas/real-execution-steps';
import { executeClosePositionSaga } from './sagas/close-position-saga';
import { RiskGuardService } from '../risk/risk-guard.service';

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private kafka: Kafka;
  private consumer: Consumer;
  private producer: Producer;
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly riskGuard: RiskGuardService,
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
    try {
      console.log('[OrdersService] onModuleInit START');
      await this.producer.connect();
      console.log('[OrdersService] producer connected');
      await this.consumer.connect();
      this.logger.log('Order consumer connected');
      await this.consumer.subscribe({
        topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
        fromBeginning: false,
      });
      await this.consumer.subscribe({
        topic: KAFKA_TOPICS.TRADING_ORDER_CLOSE_REQUESTED,
        fromBeginning: false,
      });
      this.logger.log('Order consumer subscribed');

      await this.consumer.run({
        eachMessage: async ({ topic, message }) => {
          try {
            const raw = message.value!.toString();
            if (topic === KAFKA_TOPICS.TRADING_ORDER_CLOSE_REQUESTED) {
              const event: OrderCloseRequestedEvent = JSON.parse(raw);
              await executeClosePositionSaga(event, this.prisma, this.producer, this.redis);
            } else {
              const event: OrderRequestedEvent = JSON.parse(raw);
              await this.handleOrderRequested(event);
            }
          } catch (err) {
            console.error('[OrdersService] message processing error:', err);
          }
        },
      });

      console.log('[OrdersService] consumer run called');
    } catch (err) {
      console.error('[OrdersService] onModuleInit FAILED:', err);
    }
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
    console.log(
      `[OrdersService] handleOrderRequested: ${dbOrderId} (${mode} ${order.side} ${order.symbol})`,
    );

    // Idempotency check
    const lockKey = `saga:lock:${event.requestId}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 60, 'NX');
    if (!acquired) {
      console.log(`[OrdersService] Duplicate: ${event.requestId}`);
      return;
    }

    console.log(`[OrdersService] Lock acquired, executing ${mode} order`);

    try {
      if (mode === 'paper') {
        throw new Error(
          'Paper mode disabled: use Binance Futures Testnet via real mode with network=testnet',
        );
      }

      // Resolve network from the user's exchange key so guards know whether
      // mainnet-only checks apply. Cheap DB hit, runs once per order.
      const exchangeKey = await this.prisma.exchangeKey.findFirst({
        where: { id: exchangeKeyId, userId },
        select: { network: true },
      });
      const network = (exchangeKey?.network as 'mainnet' | 'testnet') ?? 'mainnet';

      const guard = await this.riskGuard.checkAll({ userId, network, order });
      if (!guard.ok) {
        throw new Error(`Risk guard: ${guard.reason}`);
      }

      await this.executeRealOrder(event);
      console.log(`[OrdersService] Order executed OK: ${dbOrderId}`);
    } catch (err) {
      console.error(`[OrdersService] Order execution FAILED: ${dbOrderId}`, err);

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

  private async executeRealOrder(event: OrderRequestedEvent) {
    await executeRealOrderSaga(event, this.prisma, this.producer, this.redis);
    this.logger.log(`Real order executed via saga: ${event.dbOrderId}`);
  }
}
