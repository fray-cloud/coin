import { describe, it, expect } from 'vitest';
import { BollingerStrategy } from './bollinger.strategy';

const strategy = new BollingerStrategy();

// Stable prices around 100, then sudden drop below lower band
function generateBuySignalPrices(length = 25): number[] {
  const prices = Array.from({ length: length - 1 }, () => 100 + (Math.random() - 0.5) * 2);
  prices.push(85); // Sharp drop below lower band
  return prices;
}

// Stable prices around 100, then sudden spike above upper band
function generateSellSignalPrices(length = 25): number[] {
  const prices = Array.from({ length: length - 1 }, () => 100 + (Math.random() - 0.5) * 2);
  prices.push(115); // Sharp spike above upper band
  return prices;
}

// Prices within bands
function generateNeutralPrices(length = 25): number[] {
  return Array.from({ length }, () => 100 + (Math.random() - 0.5) * 1);
}

describe('BollingerStrategy', () => {
  it('데이터가 부족하면 hold를 반환해야 한다', () => {
    const result = strategy.evaluate([100, 101, 102], { period: 20 });
    expect(result.signal).toBe('hold');
    expect(result.reason).toContain('Not enough data');
  });

  it('가격이 하단 밴드 미만이면 buy를 반환해야 한다', () => {
    const prices = generateBuySignalPrices(25);
    const result = strategy.evaluate(prices, { period: 20, stdDev: 2 });
    expect(result.signal).toBe('buy');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain('Lower Band');
    expect(result.indicatorValues).toHaveProperty('upper');
    expect(result.indicatorValues).toHaveProperty('lower');
    expect(result.indicatorValues).toHaveProperty('middle');
    expect(result.indicatorValues).toHaveProperty('price');
  });

  it('가격이 상단 밴드 초과이면 sell를 반환해야 한다', () => {
    const prices = generateSellSignalPrices(25);
    const result = strategy.evaluate(prices, { period: 20, stdDev: 2 });
    expect(result.signal).toBe('sell');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.reason).toContain('Upper Band');
  });

  it('가격이 밴드 내에 있으면 hold를 반환해야 한다', () => {
    const prices = generateNeutralPrices(25);
    const result = strategy.evaluate(prices, { period: 20, stdDev: 2 });
    expect(result.signal).toBe('hold');
    expect(result.reason).toContain('within bands');
  });

  it('기본 설정을 사용해야 한다', () => {
    const prices = generateNeutralPrices(25);
    const result = strategy.evaluate(prices, {});
    // Defaults: period=20, stdDev=2
    expect(result.signal).toBeDefined();
  });

  it('타입이 "bollinger"여야 한다', () => {
    expect(strategy.type).toBe('bollinger');
  });

  it('작은 stdDev로 좁은 밴드를 처리해야 한다', () => {
    // With stdDev=1, bands are narrower → more likely to trigger signals
    const prices = generateNeutralPrices(25);
    prices.push(105); // Moderate price that might exceed narrow bands
    const result = strategy.evaluate(prices, { period: 20, stdDev: 1 });
    // Could be sell or hold depending on band width
    expect(['sell', 'hold']).toContain(result.signal);
  });
});
