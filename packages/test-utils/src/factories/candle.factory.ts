import type { Candle, ExchangeId } from '@coin/types';

let candleCounter = 0;

export function createMockCandle(overrides: Partial<Candle> = {}): Candle {
  candleCounter++;
  const basePrice = 50000000;
  return {
    exchange: 'upbit' as ExchangeId,
    symbol: 'KRW-BTC',
    interval: '1h',
    open: String(basePrice + candleCounter * 100000),
    high: String(basePrice + candleCounter * 100000 + 500000),
    low: String(basePrice + candleCounter * 100000 - 500000),
    close: String(basePrice + candleCounter * 100000 + 200000),
    volume: '10.5',
    timestamp: Date.now() - (100 - candleCounter) * 3600000,
    ...overrides,
  };
}

export function createMockCandles(count: number, overrides: Partial<Candle> = {}): Candle[] {
  return Array.from({ length: count }, () => createMockCandle(overrides));
}

export function resetCandleCounter() {
  candleCounter = 0;
}
