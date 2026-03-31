import { describe, it, expect } from 'vitest';
import { RsiStrategy } from './rsi.strategy';

const strategy = new RsiStrategy();

// Generate a monotonically decreasing series to produce low RSI
function generateDecreasingPrices(length: number, start = 100): number[] {
  return Array.from({ length }, (_, i) => start - i * 0.5);
}

// Generate a monotonically increasing series to produce high RSI
function generateIncreasingPrices(length: number, start = 50): number[] {
  return Array.from({ length }, (_, i) => start + i * 0.5);
}

// Generate a flat series to produce mid-range RSI
function generateFlatPrices(length: number, base = 100): number[] {
  return Array.from({ length }, (_, i) => base + (i % 2 === 0 ? 0.1 : -0.1));
}

describe('RsiStrategy', () => {
  it('데이터가 부족하면 hold를 반환해야 한다', () => {
    const result = strategy.evaluate([100, 101, 102], { period: 14 });
    expect(result.signal).toBe('hold');
    expect(result.confidence).toBe(0);
    expect(result.reason).toContain('Not enough data');
  });

  it('RSI가 과매도(30) 이하이면 buy를 반환해야 한다', () => {
    // Strongly decreasing prices → low RSI
    const prices = generateDecreasingPrices(30);
    const result = strategy.evaluate(prices, { period: 14, overbought: 70, oversold: 30 });
    expect(result.signal).toBe('buy');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.indicatorValues.rsi).toBeDefined();
    expect(Number(result.indicatorValues.rsi)).toBeLessThanOrEqual(30);
  });

  it('RSI가 과매수(70) 이상이면 sell를 반환해야 한다', () => {
    // Strongly increasing prices → high RSI
    const prices = generateIncreasingPrices(30);
    const result = strategy.evaluate(prices, { period: 14, overbought: 70, oversold: 30 });
    expect(result.signal).toBe('sell');
    expect(result.confidence).toBeGreaterThan(0);
    expect(Number(result.indicatorValues.rsi)).toBeGreaterThanOrEqual(70);
  });

  it('RSI가 중립 구간이면 hold를 반환해야 한다', () => {
    const prices = generateFlatPrices(30);
    const result = strategy.evaluate(prices, { period: 14, overbought: 70, oversold: 30 });
    expect(result.signal).toBe('hold');
    expect(result.reason).toContain('neutral');
  });

  it('설정이 없으면 기본값을 사용해야 한다', () => {
    const prices = generateFlatPrices(30);
    const result = strategy.evaluate(prices, {});
    // Should use defaults: period=14, overbought=70, oversold=30
    expect(result.signal).toBeDefined();
    expect(result.indicatorValues.rsi).toBeDefined();
  });

  it('사용자 정의 임계값을 적용해야 한다', () => {
    const prices = generateIncreasingPrices(30);
    // Default overbought=70 should trigger sell on strong uptrend
    const resultDefault = strategy.evaluate(prices, { period: 14, overbought: 70, oversold: 30 });
    expect(resultDefault.signal).toBe('sell');

    // Same prices but with overbought=50 should also sell (even easier to trigger)
    const resultLower = strategy.evaluate(prices, { period: 14, overbought: 50, oversold: 30 });
    expect(resultLower.signal).toBe('sell');
    // Lower threshold should have higher confidence
    expect(resultLower.confidence).toBeGreaterThanOrEqual(resultDefault.confidence);
  });

  it('타입이 "rsi"여야 한다', () => {
    expect(strategy.type).toBe('rsi');
  });
});
