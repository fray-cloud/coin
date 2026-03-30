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

  it('should return an order', async () => {
    const order = { id: 'order-1', userId: 'user-1', symbol: 'KRW-BTC' };
    mockPrisma.order.findFirst.mockResolvedValue(order);

    const result = await handler.execute(new GetOrderQuery('user-1', 'order-1'));
    expect(result).toEqual(order);
  });

  it('should throw NotFoundException if not found', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);

    await expect(handler.execute(new GetOrderQuery('user-1', 'non-existent'))).rejects.toThrow(
      NotFoundException,
    );
  });
});
