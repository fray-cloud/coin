import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DeleteStrategyHandler } from './delete-strategy.handler';
import { DeleteStrategyCommand } from './delete-strategy.command';

const mockPrisma = {
  strategy: { findFirst: vi.fn(), delete: vi.fn() },
};

describe('DeleteStrategyHandler', () => {
  let handler: DeleteStrategyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new DeleteStrategyHandler(mockPrisma as never);
  });

  it('should delete a strategy', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1' });
    mockPrisma.strategy.delete.mockResolvedValue({ id: 'strat-1' });

    const result = await handler.execute(new DeleteStrategyCommand('user-1', 'strat-1'));
    expect(result).toEqual({ id: 'strat-1', deleted: true });
  });

  it('should throw if strategy not found', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new DeleteStrategyCommand('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });
});
