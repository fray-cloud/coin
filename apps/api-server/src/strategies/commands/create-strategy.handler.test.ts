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

  it('페이퍼 전략을 생성해야 한다', async () => {
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

  it('실거래 모드에서는 exchangeKeyId가 필요하다', async () => {
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

  it('실거래 모드에서 거래소 키가 존재하는지 검증해야 한다', async () => {
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
