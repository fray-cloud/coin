import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetOrderHandler } from './get-order.handler';
import { GetOrderQuery } from './get-order.query';

const mockPrisma = { order: { findFirst: vi.fn() } };

describe('GetOrderHandler', () => {
  let handler: GetOrderHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetOrderHandler(mockPrisma as never);
  });

  it('주문을 반환해야 한다', async () => {
    const order = { id: 'order-1', userId: 'user-1', symbol: 'KRW-BTC' };
    mockPrisma.order.findFirst.mockResolvedValue(order);

    const result = await handler.execute(new GetOrderQuery('user-1', 'order-1'));
    expect(result).toEqual(order);
  });

  it('찾을 수 없으면 NotFoundException을 던져야 한다', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);

    await expect(handler.execute(new GetOrderQuery('user-1', 'non-existent'))).rejects.toThrow(
      NotFoundException,
    );
  });
});
