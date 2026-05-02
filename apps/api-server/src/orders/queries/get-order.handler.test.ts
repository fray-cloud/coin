import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

const { mockRedisGet } = vi.hoisted(() => ({ mockRedisGet: vi.fn() }));

vi.mock('ioredis', () => {
  class FakeRedis {
    get = mockRedisGet;
  }
  return { default: FakeRedis };
});

import { GetOrderHandler } from './get-order.handler';
import { GetOrderQuery } from './get-order.query';

const mockPrisma = { order: { findFirst: vi.fn() } };

describe('GetOrderHandler', () => {
  let handler: GetOrderHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetOrderHandler(mockPrisma as never);
  });

  it('주문 + 결정 + 마크 가격 + 미실현 PnL을 반환한다', async () => {
    const order = {
      id: 'order-1',
      userId: 'user-1',
      exchange: 'binance',
      symbol: 'BTCUSDT',
      side: 'long',
      status: 'filled',
      filledQuantity: '0.1',
      entryPrice: '60000',
      closedAt: null,
      llmDecision: { id: 'd-1', model: 'opus' },
      exchangeKey: { network: 'testnet' },
    };
    mockPrisma.order.findFirst.mockResolvedValue(order);
    mockRedisGet.mockResolvedValue(JSON.stringify({ price: '61000' }));

    const result = await handler.execute(new GetOrderQuery('user-1', 'order-1'));

    expect(result.order).toEqual(order);
    expect(result.decision).toEqual(order.llmDecision);
    expect(result.network).toBe('testnet');
    expect(result.markPrice).toBe(61000);
    // (61000 - 60000) * 0.1 * (long → +1) = 100
    expect(result.unrealizedPnl).toBe(100);
  });

  it('short 포지션의 미실현 PnL은 부호가 반대다', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'o',
      side: 'short',
      filledQuantity: '0.1',
      entryPrice: '60000',
      closedAt: null,
      llmDecision: null,
      exchangeKey: null,
    });
    mockRedisGet.mockResolvedValue(JSON.stringify({ price: '59000' }));

    const result = await handler.execute(new GetOrderQuery('u', 'o'));
    expect(result.unrealizedPnl).toBe(100);
  });

  it('이미 닫힌 주문은 미실현 PnL이 null', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      side: 'long',
      filledQuantity: '0.1',
      entryPrice: '60000',
      closedAt: new Date(),
      llmDecision: null,
      exchangeKey: null,
    });
    mockRedisGet.mockResolvedValue(JSON.stringify({ price: '61000' }));

    const result = await handler.execute(new GetOrderQuery('u', 'o'));
    expect(result.unrealizedPnl).toBeNull();
  });

  it('찾을 수 없으면 NotFoundException을 던진다', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    await expect(handler.execute(new GetOrderQuery('u', 'x'))).rejects.toThrow(NotFoundException);
  });
});
