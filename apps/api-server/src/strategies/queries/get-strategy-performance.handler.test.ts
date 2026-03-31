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

  it('전략을 찾을 수 없으면 예외를 던져야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new GetStrategyPerformanceQuery('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });

  it('로그가 없으면 0 메트릭을 반환해야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1', config: {} });
    mockPrisma.strategyLog.findMany.mockResolvedValue([]);

    const result = await handler.execute(new GetStrategyPerformanceQuery('user-1', 'strat-1'));
    expect(result.totalTrades).toBe(0);
    expect(result.winRate).toBe(0);
    expect(result.realizedPnl).toBe(0);
  });

  it('주문 로그로부터 성과를 계산해야 한다', async () => {
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
