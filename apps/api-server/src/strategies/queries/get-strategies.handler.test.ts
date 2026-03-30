import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetStrategiesHandler } from './get-strategies.handler';
import { GetStrategiesQuery } from './get-strategies.query';

const mockPrisma = { strategy: { findMany: vi.fn() } };

describe('GetStrategiesHandler', () => {
  let handler: GetStrategiesHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetStrategiesHandler(mockPrisma as never);
  });

  it('should return all strategies for user', async () => {
    const strategies = [
      { id: 'strat-1', name: 'RSI', type: 'rsi' },
      { id: 'strat-2', name: 'MACD', type: 'macd' },
    ];
    mockPrisma.strategy.findMany.mockResolvedValue(strategies);

    const result = await handler.execute(new GetStrategiesQuery('user-1'));
    expect(result).toEqual(strategies);
    expect(mockPrisma.strategy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
  });
});
