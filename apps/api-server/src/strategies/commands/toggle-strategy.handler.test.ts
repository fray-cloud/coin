import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ToggleStrategyHandler } from './toggle-strategy.handler';
import { ToggleStrategyCommand } from './toggle-strategy.command';

const mockPrisma = {
  strategy: { findFirst: vi.fn(), update: vi.fn() },
};

describe('ToggleStrategyHandler', () => {
  let handler: ToggleStrategyHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ToggleStrategyHandler(mockPrisma as never);
  });

  it('should toggle enabled from false to true', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1', enabled: false });
    mockPrisma.strategy.update.mockResolvedValue({ id: 'strat-1', enabled: true });

    const result = await handler.execute(new ToggleStrategyCommand('user-1', 'strat-1'));
    expect(result).toEqual({ id: 'strat-1', enabled: true });
    expect(mockPrisma.strategy.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { enabled: true } }),
    );
  });

  it('should toggle enabled from true to false', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1', enabled: true });
    mockPrisma.strategy.update.mockResolvedValue({ id: 'strat-1', enabled: false });

    const result = await handler.execute(new ToggleStrategyCommand('user-1', 'strat-1'));
    expect(result).toEqual({ id: 'strat-1', enabled: false });
  });

  it('should throw if strategy not found', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new ToggleStrategyCommand('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });
});
