import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetStrategySignalsHandler } from './get-strategy-signals.handler';
import { GetStrategySignalsQuery } from './get-strategy-signals.query';

const mockPrisma = {
  strategy: { findFirst: vi.fn() },
  strategyLog: { findMany: vi.fn() },
};

describe('GetStrategySignalsHandler', () => {
  let handler: GetStrategySignalsHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetStrategySignalsHandler(mockPrisma as never);
  });

  it('should return mapped signals', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1' });
    mockPrisma.strategyLog.findMany.mockResolvedValue([
      {
        signal: 'buy',
        action: 'signal_generated',
        details: { price: 50000000 },
        createdAt: new Date('2025-01-01'),
      },
    ]);

    const result = await handler.execute(new GetStrategySignalsQuery('user-1', 'strat-1'));
    expect(result).toHaveLength(1);
    expect(result[0].signal).toBe('buy');
    expect(result[0].price).toBe(50000000);
  });

  it('should throw if strategy not found', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new GetStrategySignalsQuery('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });
});
