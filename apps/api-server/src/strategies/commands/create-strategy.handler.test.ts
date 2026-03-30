import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateStrategyHandler } from './create-strategy.handler';
import { CreateStrategyCommand } from './create-strategy.command';

const mockPrisma = {
  exchangeKey: { findFirst: vi.fn() },
  strategy: { create: vi.fn() },
};

describe('CreateStrategyHandler', () => {
  let handler: CreateStrategyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new CreateStrategyHandler(mockPrisma as never);
  });

  it('should create a paper strategy', async () => {
    const created = { id: 'strat-1', name: 'RSI Test', type: 'rsi' };
    mockPrisma.strategy.create.mockResolvedValue(created);

    const result = await handler.execute(
      new CreateStrategyCommand('user-1', {
        name: 'RSI Test',
        type: 'rsi',
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        mode: 'signal',
        tradingMode: 'paper',
        config: { period: 14 },
      } as never),
    );

    expect(result).toEqual(created);
    expect(mockPrisma.strategy.create).toHaveBeenCalled();
  });

  it('should require exchangeKeyId for real tradingMode', async () => {
    await expect(
      handler.execute(
        new CreateStrategyCommand('user-1', {
          name: 'Test',
          type: 'rsi',
          exchange: 'upbit',
          symbol: 'KRW-BTC',
          mode: 'signal',
          tradingMode: 'real',
          config: {},
        } as never),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should validate exchange key exists for real mode', async () => {
    mockPrisma.exchangeKey.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(
        new CreateStrategyCommand('user-1', {
          name: 'Test',
          type: 'rsi',
          exchange: 'upbit',
          symbol: 'KRW-BTC',
          mode: 'signal',
          tradingMode: 'real',
          exchangeKeyId: 'key-1',
          config: {},
        } as never),
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
