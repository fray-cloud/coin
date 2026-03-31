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

  it('enabled를 false에서 true로 토글해야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1', enabled: false });
    mockPrisma.strategy.update.mockResolvedValue({ id: 'strat-1', enabled: true });

    const result = await handler.execute(new ToggleStrategyCommand('user-1', 'strat-1'));
    expect(result).toEqual({ id: 'strat-1', enabled: true });
    expect(mockPrisma.strategy.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { enabled: true } }),
    );
  });

  it('enabled를 true에서 false로 토글해야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1', enabled: true });
    mockPrisma.strategy.update.mockResolvedValue({ id: 'strat-1', enabled: false });

    const result = await handler.execute(new ToggleStrategyCommand('user-1', 'strat-1'));
    expect(result).toEqual({ id: 'strat-1', enabled: false });
  });

  it('전략을 찾을 수 없으면 예외를 던져야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new ToggleStrategyCommand('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });
});
