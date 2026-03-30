import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CancelOrderHandler } from './cancel-order.handler';
import { CancelOrderCommand } from './cancel-order.command';

const mockPrisma = {
  order: { findFirst: vi.fn(), update: vi.fn() },
  exchangeKey: { findUnique: vi.fn() },
};

describe('CancelOrderHandler', () => {
  let handler: CancelOrderHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CancelOrderHandler(mockPrisma as never);
  });

  it('should cancel a pending paper order', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: 'pending',
      mode: 'paper',
    });
    mockPrisma.order.update.mockResolvedValue({ id: 'order-1', status: 'cancelled' });

    const result = await handler.execute(new CancelOrderCommand('user-1', 'order-1'));
    expect(result).toEqual({ id: 'order-1', status: 'cancelled' });
  });

  it('should throw if order not found', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);

    await expect(handler.execute(new CancelOrderCommand('user-1', 'non-existent'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw if order is already filled', async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: 'order-1',
      userId: 'user-1',
      status: 'filled',
    });

    await expect(handler.execute(new CancelOrderCommand('user-1', 'order-1'))).rejects.toThrow(
      BadRequestException,
    );
  });
});
