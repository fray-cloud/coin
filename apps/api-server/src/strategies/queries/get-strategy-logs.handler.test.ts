import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GetStrategyLogsHandler } from './get-strategy-logs.handler';
import { GetStrategyLogsQuery } from './get-strategy-logs.query';

const mockPrisma = {
  strategy: { findFirst: vi.fn() },
  strategyLog: { findMany: vi.fn() },
};

describe('GetStrategyLogsHandler', () => {
  let handler: GetStrategyLogsHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetStrategyLogsHandler(mockPrisma as never);
  });

  it('페이지네이션으로 로그를 반환해야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1' });
    mockPrisma.strategyLog.findMany.mockResolvedValue([
      { id: 'log-1', action: 'evaluate', createdAt: new Date('2025-01-01') },
    ]);

    const result = await handler.execute(new GetStrategyLogsQuery('user-1', 'strat-1'));
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it('전략을 찾을 수 없으면 예외를 던져야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue(null);

    await expect(
      handler.execute(new GetStrategyLogsQuery('user-1', 'non-existent')),
    ).rejects.toThrow(NotFoundException);
  });

  it('action과 signal 필터를 적용해야 한다', async () => {
    mockPrisma.strategy.findFirst.mockResolvedValue({ id: 'strat-1' });
    mockPrisma.strategyLog.findMany.mockResolvedValue([]);

    await handler.execute(
      new GetStrategyLogsQuery('user-1', 'strat-1', undefined, 20, 'signal_generated', 'buy'),
    );

    const where = mockPrisma.strategyLog.findMany.mock.calls[0][0].where;
    expect(where.action).toBe('signal_generated');
    expect(where.signal).toBe('buy');
  });
});
