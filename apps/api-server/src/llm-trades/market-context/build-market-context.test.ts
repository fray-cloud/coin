import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Candle, FundingRateRecord, OpenInterestPoint } from '@coin/types';
import { buildMarketContext, formatTimestamp, type BuildDeps } from './build-market-context';

function mkCandles(n: number, baseTime = 1700000000000): Candle[] {
  return Array.from({ length: n }, (_, i) => {
    const close = 60_000 + Math.sin(i / 5) * 100 + i;
    return {
      exchange: 'binance' as const,
      symbol: 'BTCUSDT',
      interval: '1h',
      open: String(close - 1),
      high: String(close + 5),
      low: String(close - 5),
      close: String(close),
      volume: '10',
      timestamp: baseTime + i * 60 * 60_000,
    };
  });
}

function makeDeps(overrides: Partial<BuildDeps> = {}): BuildDeps {
  return {
    fetchCandles: vi.fn().mockResolvedValue(mkCandles(250)),
    fetchFundingHistory: vi.fn().mockResolvedValue([
      { symbol: 'BTCUSDT', fundingTime: Date.now() - 8 * 3600_000, fundingRate: '0.0001' },
      { symbol: 'BTCUSDT', fundingTime: Date.now(), fundingRate: '0.00015' },
    ] satisfies FundingRateRecord[]),
    fetchCurrentFunding: vi
      .fn()
      .mockResolvedValue({
        symbol: 'BTCUSDT',
        lastFundingRate: '0.00012',
        nextFundingTime: Date.now() + 3600_000,
      }),
    fetchOpenInterestHistory: vi.fn().mockResolvedValue([
      {
        symbol: 'BTCUSDT',
        sumOpenInterest: '1000',
        sumOpenInterestValueUsdt: '60000000',
        timestamp: Date.now() - 24 * 3600_000,
      },
      {
        symbol: 'BTCUSDT',
        sumOpenInterest: '1100',
        sumOpenInterestValueUsdt: '66000000',
        timestamp: Date.now(),
      },
    ] satisfies OpenInterestPoint[]),
    ...overrides,
  };
}

describe('buildMarketContext', () => {
  beforeEach(() => vi.clearAllMocks());

  it('takes only the last promptCandleCount enriched rows', async () => {
    const deps = makeDeps();
    const ctx = await buildMarketContext(
      { symbol: 'BTCUSDT', interval: '1h', promptCandleCount: 60 },
      deps,
    );
    expect(ctx.candles.length).toBe(60);
    expect(ctx.candles[0].t).toBeTruthy();
    expect(ctx.candles[59].ema200).not.toBeNull(); // last row past EMA200 warmup
  });

  it('always fetches at least 220 candles regardless of prompt count', async () => {
    const deps = makeDeps();
    await buildMarketContext({ symbol: 'BTCUSDT', interval: '1h', promptCandleCount: 30 }, deps);
    expect(deps.fetchCandles).toHaveBeenCalledWith('BTCUSDT', '1h', expect.any(Number));
    const callArgs = (deps.fetchCandles as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(callArgs[2]).toBeGreaterThanOrEqual(220);
  });

  it('throws on empty candles', async () => {
    const deps = makeDeps({ fetchCandles: vi.fn().mockResolvedValue([]) });
    await expect(
      buildMarketContext({ symbol: 'BTCUSDT', interval: '1h', promptCandleCount: 60 }, deps),
    ).rejects.toThrow();
  });

  it('returns null sentiment fields when adapters throw — degraded mode', async () => {
    const deps = makeDeps({
      fetchFundingHistory: vi.fn().mockRejectedValue(new Error('503')),
      fetchCurrentFunding: vi.fn().mockRejectedValue(new Error('503')),
      fetchOpenInterestHistory: vi.fn().mockRejectedValue(new Error('503')),
    });
    const ctx = await buildMarketContext(
      { symbol: 'BTCUSDT', interval: '1h', promptCandleCount: 60 },
      deps,
    );
    expect(ctx.sentiment.fundingRate).toBeNull();
    expect(ctx.sentiment.openInterest).toBeNull();
    // Candles still present
    expect(ctx.candles.length).toBe(60);
  });

  it('structure has swing high/low and atrPct after enough candles', async () => {
    const deps = makeDeps();
    const ctx = await buildMarketContext(
      { symbol: 'BTCUSDT', interval: '1h', promptCandleCount: 60 },
      deps,
    );
    expect(ctx.structure.swingHigh).not.toBeNull();
    expect(ctx.structure.swingLow).not.toBeNull();
    expect(ctx.structure.swingHigh).toBeGreaterThan(ctx.structure.swingLow!);
    expect(ctx.structure.atrPct).toBeGreaterThan(0);
    expect(ctx.structure.suggestedSlPct).toBeGreaterThan(0);
  });

  it('OI 24h change is positive when end > start', async () => {
    const deps = makeDeps();
    const ctx = await buildMarketContext(
      { symbol: 'BTCUSDT', interval: '1h', promptCandleCount: 60 },
      deps,
    );
    expect(ctx.sentiment.openInterest?.change24hPct).toBeCloseTo(10, 0);
  });
});

describe('formatTimestamp', () => {
  const t = Date.UTC(2026, 4, 2, 15, 23, 7); // 2026-05-02T15:23:07Z

  it('1m → minute precision', () => {
    expect(formatTimestamp(t, '1m')).toBe('2026-05-02T15:23:00Z');
  });
  it('1h → hour precision', () => {
    expect(formatTimestamp(t, '1h')).toBe('2026-05-02T15:00:00Z');
  });
  it('1d → date only', () => {
    expect(formatTimestamp(t, '1d')).toBe('2026-05-02');
  });
});
