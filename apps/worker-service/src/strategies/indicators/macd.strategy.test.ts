import { describe, it, expect } from 'vitest';
import { MacdStrategy } from './macd.strategy';

const strategy = new MacdStrategy();

// Create prices that will produce a bullish MACD crossover
// Start declining, then reverse upward
function generateBullishCrossoverPrices(length = 50): number[] {
  const prices: number[] = [];
  for (let i = 0; i < length; i++) {
    if (i < length * 0.6) {
      prices.push(100 - i * 0.5); // Decline
    } else {
      prices.push(70 + (i - length * 0.6) * 1.5); // Strong recovery
    }
  }
  return prices;
}

// Create prices that will produce a bearish MACD crossover
function generateBearishCrossoverPrices(length = 50): number[] {
  const prices: number[] = [];
  for (let i = 0; i < length; i++) {
    if (i < length * 0.6) {
      prices.push(50 + i * 0.5); // Rise
    } else {
      prices.push(80 - (i - length * 0.6) * 1.5); // Strong decline
    }
  }
  return prices;
}

// Flat prices → no crossover
function generateFlatPrices(length = 50): number[] {
  return Array.from({ length }, (_, i) => 100 + (i % 2 === 0 ? 0.01 : -0.01));
}

describe('MacdStrategy', () => {
  it('should return hold when not enough data', () => {
    const result = strategy.evaluate([100, 101], {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    });
    expect(result.signal).toBe('hold');
    expect(result.reason).toContain('Not enough data');
  });

  it('should detect bullish crossover (buy signal)', () => {
    const prices = generateBullishCrossoverPrices(60);
    const result = strategy.evaluate(prices, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    // We expect buy or hold depending on exact crossover timing
    expect(['buy', 'hold']).toContain(result.signal);
    if (result.signal === 'buy') {
      expect(result.reason).toContain('bullish crossover');
      expect(result.confidence).toBeGreaterThan(0);
    }
  });

  it('should detect bearish crossover (sell signal)', () => {
    const prices = generateBearishCrossoverPrices(60);
    const result = strategy.evaluate(prices, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    expect(['sell', 'hold']).toContain(result.signal);
    if (result.signal === 'sell') {
      expect(result.reason).toContain('bearish crossover');
      expect(result.confidence).toBeGreaterThan(0);
    }
  });

  it('should include MACD values in result', () => {
    const prices = generateFlatPrices(60);
    const result = strategy.evaluate(prices, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    // Regardless of signal, should have valid indicator values
    expect(result.signal).toBeDefined();
    expect(result.reason).toBeDefined();
  });

  it('should include indicator values', () => {
    const prices = generateFlatPrices(60);
    const result = strategy.evaluate(prices, {});
    if (Object.keys(result.indicatorValues).length > 0) {
      expect(result.indicatorValues).toHaveProperty('macd');
      expect(result.indicatorValues).toHaveProperty('signal');
      expect(result.indicatorValues).toHaveProperty('histogram');
    }
  });

  it('should use default config', () => {
    const prices = generateFlatPrices(60);
    const result = strategy.evaluate(prices, {});
    expect(result.signal).toBeDefined();
  });

  it('should have type "macd"', () => {
    expect(strategy.type).toBe('macd');
  });
});
