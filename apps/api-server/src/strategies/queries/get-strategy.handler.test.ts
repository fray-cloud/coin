import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetStrategyHandler } from './get-strategy.handler';
import { GetStrategyQuery } from './get-strategy.query';

const mockPrisma = { strategy: { findFirst: vi.fn() } };

describe('GetStrategyHandler', () => {
  let handler: GetStrategyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetStrategyHandler(mockPrisma as never);
  });

  it('should return a strategy', async () => {
    const strategy = { id: 'strat-1', name: 'RSI', userId: 'user-1' };
    mockPrisma.strategy.findFirst.mockResolvedValue(strategy);

    const result = await handler.execute(new GetStrategyQuery('user-1', 'strat-1'));
    expect(result).toEqual(strategy);
  });

  it('should throw if not found', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(handler.execute(new GetStrategyQuery('user-1', 'non-existent'))).rejects.toThrow(
      NotFoundException,
    );
  });
});
