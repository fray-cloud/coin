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

  it('사용자의 모든 전략을 반환해야 한다', async () => {
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
