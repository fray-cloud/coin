import { Injectable, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import Redis from 'ioredis';
import type { Ticker } from '@coin/types';
import { PrismaService } from '../../prisma/prisma.service';
import { GetOrderQuery } from './get-order.query';

@Injectable()
@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  private readonly redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    });
  }

  async execute(query: GetOrderQuery) {
    const order = await this.prisma.order.findFirst({
      where: { id: query.orderId, userId: query.userId },
      include: {
        llmDecision: true,
        exchangeKey: { select: { network: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const markPrice = await this.fetchMarkPrice(order.exchange, order.symbol);
    const unrealizedPnl = this.computeUnrealizedPnl(order, markPrice);

    return {
      order,
      decision: order.llmDecision,
      network: order.exchangeKey?.network ?? 'mainnet',
      markPrice,
      unrealizedPnl,
    };
  }

  private async fetchMarkPrice(exchange: string, symbol: string): Promise<number | null> {
    const data = await this.redis.get(`ticker:${exchange}:${symbol}`);
    if (!data) return null;
    const ticker: Ticker = JSON.parse(data);
    const n = Number(ticker.price);
    return Number.isFinite(n) ? n : null;
  }

  private computeUnrealizedPnl(
    order: {
      side: string;
      entryPrice: string | null;
      filledQuantity: string;
      closedAt: Date | null;
    },
    markPrice: number | null,
  ): number | null {
    if (order.closedAt) return null;
    if (markPrice == null) return null;
    const entry = Number(order.entryPrice ?? 0);
    const qty = Number(order.filledQuantity ?? 0);
    if (!entry || !qty) return null;
    const direction = order.side === 'long' ? 1 : -1;
    return Math.round((markPrice - entry) * qty * direction * 100) / 100;
  }
}
