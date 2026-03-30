import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetStrategyPerformanceHandler } from './get-strategy-performance.handler';
import { GetStrategyPerformanceQuery } from './get-strategy-performance.query';

const mockPrisma = {
  strategy: { findFirst: vi.fn() },
  strategyLog: { findMany: vi.fn() },
  order: { findMany: vi.fn() },
};

describe('GetStrategyPerformanceHandler', () => {
  let handler: GetStrategyPerformanceHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetStrategyPerformanceHandler(mockPrisma as never);
  });

  it('should throw if strategy not found', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new GetStrategyPerformanceQuery('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return zero metrics when no logs exist', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1', config: {} });
    mockPrisma.strategyLog.findMany.mockResolvedValue([]);

    const result = await handler.execute(new GetStrategyPerformanceQuery('user-1', 'strat-1'));
    expect(result.totalTrades).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.realizedPnl).toBe(0);
  });

  it('should calculate performance from order logs', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1', config: {} });
    mockPrisma.strategyLog.findMany.mockResolvedValue([
      { action: 'order_placed', details: { orderId: 'o1' }, createdAt: new Date('2025-01-01') },
      { action: 'order_placed', details: { orderId: 'o2' }, createdAt: new Date('2025-01-02') },
    ]);
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'o1',
        side: 'buy',
        filledPrice: '100',
        filledQuantity: '1',
        fee: '0.1',
        status: 'filled',
        createdAt: new Date('2025-01-01'),
      },
      {
        id: 'o2',
        side: 'sell',
        filledPrice: '110',
        filledQuantity: '1',
        fee: '0.1',
        status: 'filled',
        createdAt: new Date('2025-01-02'),
      },
    ]);

    const result = await handler.execute(new GetStrategyPerformanceQuery('user-1', 'strat-1'));
    expect(result.totalTrades).toBeGreaterThan(0);
    expect(result.realizedPnl).toBeGreaterThan(0);
  });
});
