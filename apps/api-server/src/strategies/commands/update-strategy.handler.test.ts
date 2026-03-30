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

  it('should update strategy fields', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1' });
    mockPrisma.strategy.update.mockResolvedValue({ id: 'strat-1', name: 'Updated' });

    const result = await handler.execute(
      new UpdateStrategyCommand('user-1', 'strat-1', { name: 'Updated' } as never),
    );

    expect(result).toEqual({ id: 'strat-1', name: 'Updated' });
  });

  it('should throw if strategy not found', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new UpdateStrategyCommand('user-1', 'non-existent', {} as never)),
    ).rejects.toThrow(NotFoundException);
  });
});
