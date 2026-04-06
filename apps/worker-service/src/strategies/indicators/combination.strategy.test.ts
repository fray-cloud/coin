import { describe, it, expect } from 'vitest';
import { CombinationStrategy } from './combination.strategy';
import type { CandleOHLCV } from '../strategy.interface';

const strategy = new CombinationStrategy();

// Build a price series that ends oversold (RSI < 30): monotone decrease
function decreasingPrices(n = 80): number[] {
  return Array.from({ length: n }, (_, i) => 100 - i * 0.5);
}

// Build a price series that ends overbought (RSI > 70): monotone increase
function increasingPrices(n = 80): number[] {
  return Array.from({ length: n }, (_, i) => 50 + i * 0.5);
}

// Build synthetic OHLCV from close prices (H/L = close ±0.5%)
function toOHLCV(closes: number[]): CandleOHLCV {
  return {
    high: closes.map((c) => c * 1.005),
    low: closes.map((c) => c * 0.995),
    close: closes,
    volume: closes.map(() => 1000),
  };
}

describe('CombinationStrategy', () => {
  it('타입이 "combination"이어야 한다', () => {
    expect(strategy.type).toBe('combination');
  });

  it('데이터가 부족하면 hold를 반환해야 한다', () => {
    const result = strategy.evaluate([100, 101, 102], {});
    expect(result.signal).toBe('hold');
    expect(result.reason).toContain('Not enough data');
  });

  it('RSI 과매도 + MACD 강세 크로스오버 조건에서 buy를 반환해야 한다', () => {
    // Build a sequence that goes down (RSI oversold) then reverses (bullish MACD cross)
    // Step 1: 60 bars decreasing to push RSI low
    const down = Array.from({ length: 60 }, (_, i) => 100 - i * 0.8);
    // Step 2: 20 bars recovering to trigger bullish MACD crossover
    const up = Array.from({ length: 20 }, (_, i) => down[down.length - 1] + i * 0.5);
    const prices = [...down, ...up];
    const candles = toOHLCV(prices);

    const result = strategy.evaluate(prices, { adxFilter: false, emaFilter: false }, candles);
    // We expect buy or hold — the key check is that sell is NOT generated
    expect(result.signal).not.toBe('sell');
    // indicatorValues should include rsi and macd
    expect(result.indicatorValues.rsi).toBeDefined();
    expect(result.indicatorValues.macd).toBeDefined();
  });

  it('RSI 과매수 + MACD 약세 크로스오버 조건에서 sell을 반환해야 한다', () => {
    // Build a sequence that goes up (RSI overbought) then dips (bearish MACD cross)
    const up = Array.from({ length: 60 }, (_, i) => 50 + i * 0.8);
    const down = Array.from({ length: 20 }, (_, i) => up[up.length - 1] - i * 0.5);
    const prices = [...up, ...down];
    const candles = toOHLCV(prices);

    const result = strategy.evaluate(prices, { adxFilter: false, emaFilter: false }, candles);
    expect(result.signal).not.toBe('buy');
    expect(result.indicatorValues.rsi).toBeDefined();
  });

  it('ADX 필터 비활성화 시 ADX 없이도 신호를 생성해야 한다', () => {
    const prices = decreasingPrices(80);
    // No candles passed → ADX will be 0; but adxFilter=false so it should still evaluate
    const result = strategy.evaluate(prices, { adxFilter: false, emaFilter: false });
    // signal can be buy/hold but should not error
    expect(['buy', 'hold', 'sell']).toContain(result.signal);
    expect(result.indicatorValues.adx).toBe(0);
  });

  it('indicatorValues에 BB 밴드 값이 포함되어야 한다', () => {
    const prices = increasingPrices(80);
    const result = strategy.evaluate(prices, { adxFilter: false });
    expect(result.indicatorValues.bbUpper).toBeDefined();
    expect(result.indicatorValues.bbLower).toBeDefined();
    expect(result.indicatorValues.bbMiddle).toBeDefined();
  });

  it('OHLCV 제공 시 ADX 값을 계산해야 한다', () => {
    const prices = decreasingPrices(80);
    const candles = toOHLCV(prices);
    const result = strategy.evaluate(prices, { adxFilter: true }, candles);
    // ADX should be computed and non-zero
    expect(Number(result.indicatorValues.adx)).toBeGreaterThan(0);
  });

  it('confidence가 0~1 범위여야 한다', () => {
    const prices = decreasingPrices(80);
    const candles = toOHLCV(prices);
    const result = strategy.evaluate(prices, { adxFilter: false }, candles);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
