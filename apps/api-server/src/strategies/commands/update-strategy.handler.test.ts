import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UpdateStrategyHandler } from './update-strategy.handler';
import { UpdateStrategyCommand } from './update-strategy.command';

const mockPrisma = {
  strategy: { findFirst: vi.fn(), update: vi.fn() },
  exchangeKey: { findFirst: vi.fn() },
};

describe('UpdateStrategyHandler', () => {
  let handler: UpdateStrategyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new UpdateStrategyHandler(mockPrisma as never);
  });

  it('전략 필드를 업데이트해야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1' });
    mockPrisma.strategy.update.mockResolvedValue({ id: 'strat-1', name: 'Updated' });

    const result = await handler.execute(
      new UpdateStrategyCommand('user-1', 'strat-1', { name: 'Updated' } as never),
    );

    expect(result).toEqual({ id: 'strat-1', name: 'Updated' });
  });

  it('전략을 찾을 수 없으면 예외를 던져야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new UpdateStrategyCommand('user-1', 'non-existent', {} as never)),
    ).rejects.toThrow(NotFoundException);
  });
});
