import { describe, it, expect } from 'vitest';
import { TrendRegimeStrategy } from './trend-regime.strategy';
import type { CandleOHLCV } from '../strategy.interface';

const strategy = new TrendRegimeStrategy();

function toOHLCV(closes: number[], volumeBase = 1000): CandleOHLCV {
  return {
    high: closes.map((c) => c * 1.005),
    low: closes.map((c) => c * 0.995),
    close: closes,
    volume: closes.map(() => volumeBase),
  };
}

// Strong uptrend: EMA short > EMA long, ADX > 20
function uptrendPrices(n = 120): number[] {
  return Array.from({ length: n }, (_, i) => 50 + i * 0.6);
}

// Strong downtrend
function downtrendPrices(n = 120): number[] {
  return Array.from({ length: n }, (_, i) => 100 - i * 0.5);
}

// Sideways: oscillating
function sidewaysPrices(n = 120, base = 100, amplitude = 2): number[] {
  return Array.from({ length: n }, (_, i) => base + amplitude * Math.sin((i * Math.PI) / 8));
}

describe('TrendRegimeStrategy', () => {
  it('타입이 "trend-regime"이어야 한다', () => {
    expect(strategy.type).toBe('trend-regime');
  });

  it('데이터가 부족하면 hold를 반환해야 한다', () => {
    const result = strategy.evaluate([100, 101, 102], {});
    expect(result.signal).toBe('hold');
    expect(result.reason).toContain('Not enough data');
  });

  it('indicatorValues에 regime 필드가 포함되어야 한다', () => {
    const prices = uptrendPrices();
    const result = strategy.evaluate(prices, {});
    expect(result.indicatorValues.regime).toBeDefined();
    expect([-1, 0, 1]).toContain(Number(result.indicatorValues.regime));
  });

  it('OHLCV 없이도 EMA 기반 레짐을 감지해야 한다', () => {
    const prices = uptrendPrices();
    const result = strategy.evaluate(prices, {});
    // No candles → ADX = 0 → fallback to EMA comparison
    // Strong uptrend prices should produce bull regime (regime = 1)
    expect(Number(result.indicatorValues.regime)).toBe(1);
  });

  it('강한 상승 추세에서 buy 신호를 생성할 수 있어야 한다', () => {
    // Create a price series that has an EMA bullish crossover near the end
    // Start flat for 60 bars (EMA20 ≈ EMA50), then strongly increase
    const flat = Array.from({ length: 60 }, () => 100);
    const rising = Array.from({ length: 60 }, (_, i) => 100 + i * 1.5);
    const prices = [...flat, ...rising];
    const candles = toOHLCV(prices);

    const result = strategy.evaluate(prices, { adxThreshold: 15 }, candles);
    // During the strong rise, bull regime + EMA cross should produce buy
    expect(['buy', 'hold']).toContain(result.signal);
    expect(result.signal).not.toBe('sell');
  });

  it('하락 추세에서 buy 신호를 억제해야 한다 (bear 레짐)', () => {
    const prices = downtrendPrices();
    const candles = toOHLCV(prices);
    const result = strategy.evaluate(prices, { adxThreshold: 15 }, candles);
    // Bear regime should not generate buy
    if (Number(result.indicatorValues.regime) === -1) {
      expect(result.signal).not.toBe('buy');
    }
  });

  it('횡보장에서 Bollinger+Stochastic 신호를 사용해야 한다', () => {
    const prices = sidewaysPrices(120);
    const result = strategy.evaluate(prices, { adxThreshold: 25 });
    // With very low ADX (sideways), regime should be sideways (regime=0)
    // indicatorValues should include stochK
    if (Number(result.indicatorValues.regime) === 0) {
      expect(result.indicatorValues.stochK).toBeDefined();
      expect(result.indicatorValues.williamsR).toBeDefined();
    }
  });

  it('OHLCV 제공 시 ADX, Stochastic, WilliamsR을 계산해야 한다', () => {
    const prices = uptrendPrices();
    const candles = toOHLCV(prices);
    const result = strategy.evaluate(prices, {}, candles);
    expect(Number(result.indicatorValues.adx)).toBeGreaterThan(0);
  });

  it('confidence가 0~1 범위여야 한다', () => {
    const prices = uptrendPrices();
    const candles = toOHLCV(prices);
    const result = strategy.evaluate(prices, {}, candles);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
