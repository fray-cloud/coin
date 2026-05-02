import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ioredis', () => {
  class FakeRedis {
    get = vi.fn().mockResolvedValue(null);
  }
  return { default: FakeRedis };
});

import { PortfolioService } from './portfolio.service';

const mockKeys = [
  {
    id: 'k-test',
    userId: 'u',
    exchange: 'binance',
    network: 'testnet',
    apiKey: 'enc',
    secretKey: 'enc',
  },
  {
    id: 'k-main',
    userId: 'u',
    exchange: 'binance',
    network: 'mainnet',
    apiKey: 'enc',
    secretKey: 'enc',
  },
];

const mockOrders = [
  {
    id: 'o-test',
    userId: 'u',
    exchange: 'binance',
    symbol: 'BTCUSDT',
    side: 'long',
    status: 'filled',
    filledQuantity: '0.01',
    filledPrice: '60000',
    fee: '0.5',
    realizedPnl: '5',
    createdAt: new Date('2026-04-01T00:00:00Z'),
    exchangeKey: { network: 'testnet' },
  },
  {
    id: 'o-main',
    userId: 'u',
    exchange: 'binance',
    symbol: 'BTCUSDT',
    side: 'long',
    status: 'filled',
    filledQuantity: '0.02',
    filledPrice: '60000',
    fee: '1',
    realizedPnl: '10',
    createdAt: new Date('2026-04-02T00:00:00Z'),
    exchangeKey: { network: 'mainnet' },
  },
];

const mockPrisma = {
  exchangeKey: { findMany: vi.fn().mockResolvedValue(mockKeys) },
  order: { findMany: vi.fn().mockResolvedValue(mockOrders) },
};
const mockConfig = { getOrThrow: vi.fn().mockReturnValue('master-key') };

vi.mock('@coin/utils', () => ({
  decrypt: vi.fn().mockReturnValue('plaintext'),
}));

vi.mock('@coin/exchange-adapters', () => {
  class FakeBinanceRest {
    getBalances = vi.fn().mockResolvedValue([]);
  }
  return { BinanceRest: FakeBinanceRest };
});

describe('PortfolioService.getSummary', () => {
  let svc: PortfolioService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.exchangeKey.findMany.mockResolvedValue(mockKeys);
    mockPrisma.order.findMany.mockResolvedValue(mockOrders);
    svc = new PortfolioService(mockPrisma as never, mockConfig as never);
  });

  it('network=testnet 은 testnet 합계만 반환한다', async () => {
    const result = await svc.getSummary('u', 'testnet');
    expect(result.network).toBe('testnet');
    expect(result.realizedPnl).toBe(5);
    expect(result.byNetwork.testnet.realizedPnl).toBe(5);
    expect(result.byNetwork.mainnet.realizedPnl).toBe(10);
  });

  it('network=mainnet 은 mainnet 합계만 반환한다', async () => {
    const result = await svc.getSummary('u', 'mainnet');
    expect(result.network).toBe('mainnet');
    expect(result.realizedPnl).toBe(10);
  });

  it('network=all 은 합계 + byNetwork 분할을 반환한다', async () => {
    const result = await svc.getSummary('u', 'all');
    expect(result.network).toBe('all');
    expect(result.realizedPnl).toBe(15);
    expect(result.byNetwork.testnet.realizedPnl).toBe(5);
    expect(result.byNetwork.mainnet.realizedPnl).toBe(10);
  });
});
