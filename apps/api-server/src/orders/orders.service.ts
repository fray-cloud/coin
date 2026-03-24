import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderRequestedEvent } from '@coin/kafka-contracts';
import type { ExchangeId, OrderRequest } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private readonly prisma: PrismaService) {
    this.kafka = new Kafka({
      clientId: 'api-orders',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.log('Orders Kafka producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    if (dto.mode === 'real' && !dto.exchangeKeyId) {
      throw new BadRequestException('exchangeKeyId is required for real trading');
    }

    // 숫자 문자열에서 콤마 제거
    dto.quantity = dto.quantity.replace(/,/g, '');
    if (dto.price) dto.price = dto.price.replace(/,/g, '');

    if (dto.type === 'limit' && !dto.price) {
      throw new BadRequestException('price is required for limit orders');
    }

    // real 모드일 때 exchangeKey 소유 검증
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

    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
      messages: [{ key: userId, value: JSON.stringify(event) }],
    });

    this.logger.log(`Order submitted: ${order.id} (${dto.mode} ${dto.side} ${dto.symbol})`);
    return { id: order.id, status: 'pending' };
  }

  async getOrders(userId: string, cursor?: string, limit = 20) {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = orders.length > limit;
    const items = hasMore ? orders.slice(0, limit) : orders;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;

    return { items, nextCursor };
  }

  async getOrder(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(userId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, userId },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!['pending', 'placed'].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order with status: ${order.status}`);
    }

    if (order.mode === 'real' && order.exchangeOrderId) {
      // 실거래 취소: Kafka 이벤트로 Worker에 위임할 수도 있지만,
      // 여기서는 직접 REST API 호출 (동기)
      const { UpbitRest, BinanceRest, BybitRest } = await import('@coin/exchange-adapters');
      const { decrypt } = await import('@coin/utils');
      const { ConfigService } = await import('@nestjs/config');

      if (order.exchangeKeyId) {
        const key = await this.prisma.exchangeKey.findFirst({
          where: { id: order.exchangeKeyId, userId },
        });
        if (key) {
          const masterKey = process.env.ENCRYPTION_MASTER_KEY;
          if (masterKey) {
            const adapters = { upbit: UpbitRest, binance: BinanceRest, bybit: BybitRest };
            const AdapterClass = adapters[order.exchange as ExchangeId];
            const adapter = new AdapterClass();
            const credentials = {
              apiKey: decrypt(key.apiKey, masterKey),
              secretKey: decrypt(key.secretKey, masterKey),
            };
            try {
              await adapter.cancelOrder(credentials, order.exchangeOrderId, order.symbol);
            } catch (err) {
              this.logger.warn(`Exchange cancel failed: ${err}`);
            }
          }
        }
      }
    }

    await this.prisma.order.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    return { id, status: 'cancelled' };
  }
}
