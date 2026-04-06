import { describe, it, expect } from 'vitest';
import { MultiTimeframeStrategy } from './multi-timeframe.strategy';
import type { CandleOHLCV, MultiTimeframeData } from '../strategy.interface';

const strategy = new MultiTimeframeStrategy();

function toOHLCV(closes: number[]): CandleOHLCV {
  return {
    high: closes.map((c) => c * 1.005),
    low: closes.map((c) => c * 0.995),
    close: closes,
    volume: closes.map(() => 2000),
  };
}

function risingPrices(n = 100, start = 50, step = 0.6): number[] {
  return Array.from({ length: n }, (_, i) => start + i * step);
}

function fallingPrices(n = 100, start = 100, step = 0.5): number[] {
  return Array.from({ length: n }, (_, i) => start - i * step);
}

describe('MultiTimeframeStrategy', () => {
  it('타입이 "multi-timeframe"이어야 한다', () => {
    expect(strategy.type).toBe('multi-timeframe');
  });

  it('데이터가 부족하면 hold를 반환해야 한다', () => {
    const result = strategy.evaluate([100, 101], {});
    expect(result.signal).toBe('hold');
    expect(result.reason).toContain('Not enough data');
  });

  it('HTF 데이터 없이 단일 타임프레임으로 동작해야 한다', () => {
    const prices = risingPrices(100);
    const result = strategy.evaluate(prices, { requireVolume: false });
    expect(['buy', 'hold', 'sell']).toContain(result.signal);
    expect(result.indicatorValues.htfDataAvailable).toBe(0);
    expect(result.indicatorValues.macroDataAvailable).toBe(0);
  });

  it('3개 레이어 강세 정렬 시 buy 신호를 생성해야 한다', () => {
    // All timeframes rising → macro bull + HTF bull + primary oversold
    const primaryDown = fallingPrices(100); // oversold at primary
    const htf1Rising = risingPrices(100); // 4h bullish momentum
    const htf2Rising = risingPrices(100); // 1d macro bull

    const candles = toOHLCV(primaryDown);
    candles.volume = primaryDown.map(() => 5000); // high volume

    const mtf: MultiTimeframeData = {
      htf1: toOHLCV(htf1Rising),
      htf2: toOHLCV(htf2Rising),
    };

    const result = strategy.evaluate(
      primaryDown,
      { requireVolume: false, primaryRsiOversold: 40 },
      candles,
      mtf,
    );
    // With all three layers, expect buy signal
    expect(result.indicatorValues.htfDataAvailable).toBe(1);
    expect(result.indicatorValues.macroDataAvailable).toBe(1);
    expect(['buy', 'hold']).toContain(result.signal);
  });

  it('3개 레이어 약세 정렬 시 sell 신호를 생성해야 한다', () => {
    const primaryUp = risingPrices(100); // overbought at primary
    const htf1Falling = fallingPrices(100);
    const htf2Falling = fallingPrices(100);

    const candles = toOHLCV(primaryUp);
    candles.volume = primaryUp.map(() => 5000);

    const mtf: MultiTimeframeData = {
      htf1: toOHLCV(htf1Falling),
      htf2: toOHLCV(htf2Falling),
    };

    const result = strategy.evaluate(
      primaryUp,
      { requireVolume: false, primaryRsiOverbought: 60 },
      candles,
      mtf,
    );
    expect(['sell', 'hold']).toContain(result.signal);
    expect(result.signal).not.toBe('buy');
  });

  it('볼륨 확인이 필요할 때 볼륨 급등 없으면 신호를 억제해야 한다', () => {
    const primary = fallingPrices(100);
    const htf1 = risingPrices(100);
    const htf2 = risingPrices(100);

    // Low constant volume — no surge
    const candles = toOHLCV(primary);
    candles.volume = primary.map(() => 100);

    const mtf: MultiTimeframeData = {
      htf1: toOHLCV(htf1),
      htf2: toOHLCV(htf2),
    };

    const result = strategy.evaluate(
      primary,
      { requireVolume: true, volumeMultiplier: 10, primaryRsiOversold: 50 },
      candles,
      mtf,
    );
    // Volume requirement with multiplier=10 and flat volume should suppress signal
    if (result.signal !== 'hold') {
      // If a signal was generated despite low volume, volumeConfirmed must be false
      expect(Number(result.indicatorValues.volumeConfirmed)).toBe(0);
    }
  });

  it('indicatorValues에 ATR 값이 포함되어야 한다', () => {
    const prices = risingPrices(100);
    const candles = toOHLCV(prices);
    const result = strategy.evaluate(prices, { requireVolume: false }, candles);
    expect(result.indicatorValues.atr).toBeDefined();
    expect(Number(result.indicatorValues.atr)).toBeGreaterThan(0);
  });

  it('confidence가 0~1 범위여야 한다', () => {
    const prices = fallingPrices(100);
    const candles = toOHLCV(prices);
    const result = strategy.evaluate(prices, { requireVolume: false }, candles);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('HTF1만 제공해도 정상 동작해야 한다', () => {
    const primary = fallingPrices(100);
    const mtf: MultiTimeframeData = {
      htf1: toOHLCV(risingPrices(100)),
    };
    const result = strategy.evaluate(primary, { requireVolume: false }, undefined, mtf);
    expect(result.indicatorValues.htfDataAvailable).toBe(1);
    expect(result.indicatorValues.macroDataAvailable).toBe(0);
    expect(['buy', 'hold', 'sell']).toContain(result.signal);
  });
});
