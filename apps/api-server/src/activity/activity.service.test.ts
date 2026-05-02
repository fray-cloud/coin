import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivityService } from './activity.service';

const mockPrisma = {
  order: { findMany: vi.fn() },
  loginHistory: { findMany: vi.fn() },
};

describe('ActivityService', () => {
  let svc: ActivityService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new ActivityService(mockPrisma as never);
  });

  it('주문 활동 항목은 /orders/${id} 로 링크된다', async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: 'order-abc',
        side: 'long',
        symbol: 'BTCUSDT',
        type: 'market',
        quantity: '0.01',
        filledPrice: '60000',
        price: null,
        mode: 'real',
        exchange: 'binance',
        status: 'filled',
        createdAt: new Date('2026-04-01T00:00:00Z'),
      },
    ]);
    mockPrisma.loginHistory.findMany.mockResolvedValue([]);

    const { items } = await svc.getActivity('user-1');
    const orderItem = items.find((i) => i.type === 'order');
    expect(orderItem?.link).toBe('/orders/order-abc');
  });
});
