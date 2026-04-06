import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ReorderStrategiesHandler } from './reorder-strategies.handler';
import { ReorderStrategiesCommand } from './reorder-strategies.command';

const mockPrisma = {
  strategy: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn(),
};

describe('ReorderStrategiesHandler', () => {
  let handler: ReorderStrategiesHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new ReorderStrategiesHandler(mockPrisma as never);
  });

  it('전략 순서를 일괄 업데이트해야 한다', async () => {
    mockPrisma.strategy.findMany.mockResolvedValue([{ id: 'strat-1' }, { id: 'strat-2' }]);
    mockPrisma.$transaction.mockResolvedValue([]);

    await handler.execute(
      new ReorderStrategiesCommand('user-1', {
        orders: [
          { id: 'strat-1', order: 0 },
          { id: 'strat-2', order: 1 },
        ],
      }),
    );

    expect(mockPrisma.strategy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['strat-1', 'strat-2'] }, userId: 'user-1' } }),
    );
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('빈 orders 배열이면 아무 작업도 하지 않아야 한다', async () => {
    await handler.execute(new ReorderStrategiesCommand('user-1', { orders: [] }));

    expect(mockPrisma.strategy.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('소유하지 않은 전략 ID가 포함되면 예외를 던져야 한다', async () => {
    mockPrisma.strategy.findMany.mockResolvedValue([{ id: 'strat-1' }]);

    await expect(
      handler.execute(
        new ReorderStrategiesCommand('user-1', {
          orders: [
            { id: 'strat-1', order: 0 },
            { id: 'strat-99', order: 1 },
          ],
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
