import { describe, it, expect } from 'vitest';
import type { Candle } from '@coin/types';
import { computeIndicators } from './compute';

function mkCandles(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    exchange: 'binance' as const,
    symbol: 'BTCUSDT',
    interval: '1h',
    open: String(c),
    high: String(c + 1),
    low: String(c - 1),
    close: String(c),
    volume: '1',
    timestamp: 1700000000000 + i * 60_000,
  }));
}

describe('computeIndicators', () => {
  it('output length equals input length, with warmup nulls at the start', () => {
    const candles = mkCandles(Array.from({ length: 250 }, (_, i) => 60_000 + i * 10));
    const series = computeIndicators(candles);
    expect(series.rows.length).toBe(250);

    // EMA200 needs ~200 candles of warmup
    expect(series.rows[10].ema200).toBeNull();
    expect(series.rows[249].ema200).not.toBeNull();

    // RSI14 needs 14 warmup
    expect(series.rows[5].rsi14).toBeNull();
    expect(series.rows[249].rsi14).not.toBeNull();
  });

  it('an upward-trending close series produces RSI > 70 near the end (overbought)', () => {
    const closes = Array.from({ length: 50 }, (_, i) => 100 + i * 2);
    const series = computeIndicators(mkCandles(closes));
    const rsi = series.rows[series.rows.length - 1].rsi14!;
    expect(rsi).toBeGreaterThan(90);
  });

  it('flat closes produce a defined RSI value (no warmup nulls past period 14)', () => {
    const closes = Array.from({ length: 50 }, () => 100);
    const series = computeIndicators(mkCandles(closes));
    // technicalindicators returns RSI=100 when there are no down-moves;
    // we just assert a finite value past warmup, not the specific number.
    const rsi = series.rows[series.rows.length - 1].rsi14;
    expect(rsi).not.toBeNull();
    expect(Number.isFinite(rsi!)).toBe(true);
  });

  it('Bollinger middle equals SMA(close, 20) at the last row', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    const series = computeIndicators(mkCandles(closes));
    const last = series.rows[series.rows.length - 1];
    const sma20 = closes.slice(-20).reduce((s, v) => s + v, 0) / 20;
    expect(last.bbMiddle).not.toBeNull();
    expect(Math.abs(last.bbMiddle! - sma20)).toBeLessThan(0.01);
  });

  it('ATR is positive for non-flat candles', () => {
    const candles = mkCandles(Array.from({ length: 30 }, (_, i) => 100 + i));
    const series = computeIndicators(candles);
    const atr = series.rows[series.rows.length - 1].atr14;
    expect(atr).not.toBeNull();
    expect(atr!).toBeGreaterThan(0);
  });
});
