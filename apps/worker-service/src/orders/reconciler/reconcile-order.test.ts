import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reconcileOrder, type ReconcileDeps } from './reconcile-order';

function makeOrder(overrides: Partial<Parameters<typeof reconcileOrder>[0]> = {}) {
  return {
    id: 'o-1',
    userId: 'u',
    exchange: 'binance',
    symbol: 'BTCUSDT',
    side: 'long',
    quantity: '0.01',
    filledQuantity: '0.01',
    entryPrice: '60000',
    tpOrderId: 'tp-1',
    slOrderId: 'sl-1',
    exchangeKeyId: 'k',
    createdAt: new Date('2026-05-01T00:00:00Z'),
    ...overrides,
  };
}

function makeDeps(): {
  deps: ReconcileDeps;
  redis: { set: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn> };
  prismaUpdate: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  getPosition: ReturnType<typeof vi.fn>;
  getIncome: ReturnType<typeof vi.fn>;
} {
  const redis = {
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  };
  const prismaUpdate = vi.fn().mockResolvedValue({ count: 1 });
  const emit = vi.fn().mockResolvedValue(undefined);
  const getPosition = vi.fn();
  const getIncome = vi.fn();
  const deps: ReconcileDeps = {
    redis,
    prisma: { order: { updateMany: prismaUpdate } },
    getPosition,
    getIncome,
    emit,
  };
  return { deps, redis, prismaUpdate, emit, getPosition, getIncome };
}

describe('reconcileOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('포지션이 살아있으면 skip', async () => {
    const { deps, getPosition, prismaUpdate } = makeDeps();
    getPosition.mockResolvedValue({
      symbol: 'BTCUSDT',
      side: 'long',
      quantity: '0.01',
    });

    const result = await reconcileOrder(makeOrder(), deps);

    expect(result).toEqual({ action: 'skip', reason: 'live_position' });
    expect(prismaUpdate).not.toHaveBeenCalled();
  });

  it('TP 발동 (양수 PnL + tp/sl 등록됨) → take_profit', async () => {
    const { deps, getPosition, getIncome, prismaUpdate } = makeDeps();
    getPosition.mockResolvedValue(null);
    getIncome.mockResolvedValue([
      { symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL', income: '5.5', asset: 'USDT', time: 1 },
      { symbol: 'BTCUSDT', incomeType: 'COMMISSION', income: '-0.05', asset: 'USDT', time: 1 },
    ]);

    const result = await reconcileOrder(makeOrder(), deps);

    expect(result).toMatchObject({ action: 'closed', reason: 'take_profit' });
    expect(prismaUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o-1', closedAt: null },
        data: expect.objectContaining({ status: 'closed', closeReason: 'take_profit' }),
      }),
    );
  });

  it('SL 발동 (음수 PnL + tp/sl 등록됨) → stop_loss', async () => {
    const { deps, getPosition, getIncome } = makeDeps();
    getPosition.mockResolvedValue(null);
    getIncome.mockResolvedValue([
      { symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL', income: '-3.0', asset: 'USDT', time: 1 },
    ]);

    const result = await reconcileOrder(makeOrder(), deps);
    expect(result).toMatchObject({ action: 'closed', reason: 'stop_loss' });
  });

  it('INSURANCE_CLEAR row 존재 → liquidation', async () => {
    const { deps, getPosition, getIncome } = makeDeps();
    getPosition.mockResolvedValue(null);
    getIncome.mockResolvedValue([
      { symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL', income: '-10', asset: 'USDT', time: 1 },
      { symbol: 'BTCUSDT', incomeType: 'INSURANCE_CLEAR', income: '-2', asset: 'USDT', time: 1 },
    ]);

    const result = await reconcileOrder(makeOrder(), deps);
    expect(result).toMatchObject({ action: 'closed', reason: 'liquidation' });
  });

  it('income endpoint이 빈 배열 → reconciled_unknown (다음 tick에 정정)', async () => {
    const { deps, getPosition, getIncome } = makeDeps();
    getPosition.mockResolvedValue(null);
    getIncome.mockResolvedValue([]);

    const result = await reconcileOrder(makeOrder(), deps);
    expect(result).toEqual({ action: 'closed', reason: 'reconciled_unknown', realizedPnl: null });
  });

  it('Redis 잠금이 잡히면 skip (lock_held) — 동시 실행 보호', async () => {
    const { deps, redis } = makeDeps();
    redis.set.mockResolvedValue(null);

    const result = await reconcileOrder(makeOrder(), deps);
    expect(result).toEqual({ action: 'skip', reason: 'lock_held' });
  });

  it('수동 close가 먼저 닫아두면 race_lost — 알림 중복 발송하지 않음', async () => {
    const { deps, getPosition, getIncome, prismaUpdate, emit } = makeDeps();
    getPosition.mockResolvedValue(null);
    getIncome.mockResolvedValue([
      { symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL', income: '5', asset: 'USDT', time: 1 },
    ]);
    prismaUpdate.mockResolvedValue({ count: 0 });

    const result = await reconcileOrder(makeOrder(), deps);
    expect(result).toEqual({ action: 'skip', reason: 'race_lost' });
    expect(emit).not.toHaveBeenCalled();
  });

  it('TP/SL 미등록 + 양수 PnL → manual_on_exchange (사용자가 거래소에서 직접 닫음)', async () => {
    const { deps, getPosition, getIncome } = makeDeps();
    getPosition.mockResolvedValue(null);
    getIncome.mockResolvedValue([
      { symbol: 'BTCUSDT', incomeType: 'REALIZED_PNL', income: '7', asset: 'USDT', time: 1 },
    ]);

    const result = await reconcileOrder(makeOrder({ tpOrderId: null, slOrderId: null }), deps);
    expect(result).toMatchObject({ action: 'closed', reason: 'manual_on_exchange' });
  });
});
