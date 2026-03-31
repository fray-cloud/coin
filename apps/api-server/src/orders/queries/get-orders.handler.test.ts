import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetOrdersHandler } from './get-orders.handler';
import { GetOrdersQuery } from './get-orders.query';

const mockPrisma = { order: { findMany: vi.fn() } };

describe('GetOrdersHandler', () => {
  let handler: GetOrdersHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetOrdersHandler(mockPrisma as never);
  });

  it('페이지네이션으로 주문 목록을 반환해야 한다', async () => {
    const orders = [
      { id: '1', createdAt: new Date('2025-01-02') },
      { id: '2', createdAt: new Date('2025-01-01') },
    ];
    mockPrisma.order.findMany.mockResolvedValue(orders);

    const result = await handler.execute(new GetOrdersQuery('user-1', undefined, 20));
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBeNull();
  });

  it('더 많은 데이터가 있으면 nextCursor를 반환해야 한다', async () => {
    // Return limit + 1 items to indicate hasMore
    const orders = Array.from({ length: 21 }, (_, i) => ({
      id: `order-${i}`,
      createdAt: new Date(2025, 0, 21 - i),
    }));
    mockPrisma.order.findMany.mockResolvedValue(orders);

    const result = await handler.execute(new GetOrdersQuery('user-1', undefined, 20));
    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBeDefined();
  });

  it('필터를 적용해야 한다', async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);

    await handler.execute(
      new GetOrdersQuery('user-1', undefined, 20, 'filled', 'upbit', 'KRW-BTC', 'paper', 'buy'),
    );

    const where = mockPrisma.order.findMany.mock.calls[0][0].where;
    expect(where.userId).toBe('user-1');
    expect(where.status).toBe('filled');
    expect(where.exchange).toBe('upbit');
    expect(where.symbol).toBe('KRW-BTC');
    expect(where.mode).toBe('paper');
    expect(where.side).toBe('buy');
  });
});
