import { describe, it, expect, vi, beforeEach } from 'vitest';

const { closePositionMock, getPositionMock } = vi.hoisted(() => ({
  closePositionMock: vi.fn(),
  getPositionMock: vi.fn(),
}));

vi.mock('@coin/exchange-adapters', () => {
  class FakeBinanceRest {
    closePosition = closePositionMock;
    getPosition = getPositionMock;
  }
  return { BinanceRest: FakeBinanceRest };
});

vi.mock('@coin/utils', () => ({
  decrypt: vi.fn().mockReturnValue('plain'),
}));

import { executeClosePositionSaga } from './close-position-saga';

describe('executeClosePositionSaga', () => {
  const order = {
    id: 'o-1',
    userId: 'u',
    exchange: 'binance',
    symbol: 'BTCUSDT',
    side: 'long',
    status: 'filled',
    closedAt: null,
    exchangeKeyId: 'k',
    quantity: '0.01',
    filledQuantity: '0.01',
    entryPrice: '60000',
  };
  const exchangeKey = { id: 'k', userId: 'u', apiKey: 'enc', secretKey: 'enc', network: 'mainnet' };
  const livePosition = {
    exchange: 'binance',
    symbol: 'BTCUSDT',
    side: 'long',
    quantity: '0.01',
    entryPrice: '60000',
    markPrice: '60500',
    liquidationPrice: '0',
    leverage: 5,
    marginType: 'ISOLATED',
    unrealizedPnl: '5',
  };

  let prisma: any;
  let producer: any;
  let redis: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ENCRYPTION_MASTER_KEY = 'master';
    prisma = {
      order: {
        findFirst: vi.fn().mockResolvedValue(order),
        update: vi.fn().mockResolvedValue(undefined),
      },
      exchangeKey: { findFirst: vi.fn().mockResolvedValue(exchangeKey) },
    };
    producer = { send: vi.fn().mockResolvedValue(undefined) };
    redis = { set: vi.fn().mockResolvedValue('OK') };
    closePositionMock.mockResolvedValue({
      orderId: 'ex-1',
      status: 'filled',
      filledPrice: '61000',
      filledQuantity: '0.01',
      symbol: 'BTCUSDT',
      side: 'long',
      type: 'market',
      price: '0',
      fee: '0',
      feeCurrency: 'USDT',
      timestamp: Date.now(),
    });
    getPositionMock.mockResolvedValue(livePosition);
  });

  it('포지션이 살아있으면 closePosition으로 종료한다', async () => {
    await executeClosePositionSaga(
      { requestId: 'r1', userId: 'u', dbOrderId: 'o-1' },
      prisma,
      producer,
      redis,
    );

    expect(closePositionMock).toHaveBeenCalledWith(
      expect.objectContaining({ network: 'mainnet' }),
      'BTCUSDT',
      'long',
      '0.01',
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o-1' },
        data: expect.objectContaining({ status: 'closed' }),
      }),
    );
  });

  it('Binance에 포지션이 이미 없으면 closePosition을 부르지 않고 DB만 동기화한다 (TP/SL 사후 처리)', async () => {
    getPositionMock.mockResolvedValue(null);
    await executeClosePositionSaga(
      { requestId: 'r4', userId: 'u', dbOrderId: 'o-1' },
      prisma,
      producer,
      redis,
    );
    expect(closePositionMock).not.toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'closed' }),
      }),
    );
  });

  it('closePosition이 -2022 reduceOnly rejection을 던지면 DB만 동기화한다', async () => {
    closePositionMock.mockRejectedValue(
      new Error('Binance error -2022 ReduceOnly Order is rejected'),
    );
    await executeClosePositionSaga(
      { requestId: 'r5', userId: 'u', dbOrderId: 'o-1' },
      prisma,
      producer,
      redis,
    );
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'closed' }),
      }),
    );
  });

  it('이미 닫힌 주문은 closePosition을 호출하지 않는다', async () => {
    prisma.order.findFirst.mockResolvedValue({ ...order, closedAt: new Date() });
    await executeClosePositionSaga(
      { requestId: 'r2', userId: 'u', dbOrderId: 'o-1' },
      prisma,
      producer,
      redis,
    );
    expect(closePositionMock).not.toHaveBeenCalled();
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('중복 requestId 잠금이 잡히면 노옵', async () => {
    redis.set.mockResolvedValue(null);
    await executeClosePositionSaga(
      { requestId: 'r3', userId: 'u', dbOrderId: 'o-1' },
      prisma,
      producer,
      redis,
    );
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
    expect(closePositionMock).not.toHaveBeenCalled();
  });
});
