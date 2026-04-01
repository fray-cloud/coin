import { describe, it, expect } from 'vitest';
import type { Candle } from '@coin/types';
import { CandleStreamNode } from '../nodes/data-candle-stream.node';
import { RsiNode } from '../nodes/indicator-rsi.node';
import { MacdNode } from '../nodes/indicator-macd.node';
import { BollingerNode } from '../nodes/indicator-bollinger.node';
import { EmaNode } from '../nodes/indicator-ema.node';
import { ThresholdNode } from '../nodes/condition-threshold.node';
import { CrossoverNode } from '../nodes/condition-crossover.node';
import { AndOrNode } from '../nodes/condition-and-or.node';
import { MarketOrderNode } from '../nodes/order-market.node';
import { AlertNode } from '../nodes/order-alert.node';

function generateCandles(count: number, trend: 'up' | 'down' | 'flat' = 'flat'): Candle[] {
  const base = 100;
  return Array.from({ length: count }, (_, i) => {
    let close: number;
    if (trend === 'down') close = base - i * 0.5;
    else if (trend === 'up') close = base + i * 0.5;
    else close = base + (i % 2 === 0 ? 0.1 : -0.1);

    return {
      exchange: 'upbit' as const,
      symbol: 'BTC/KRW',
      interval: '1h',
      open: String(close + 0.1),
      high: String(close + 0.5),
      low: String(close - 0.5),
      close: String(close),
      volume: '100',
      timestamp: Date.now() - (count - i) * 3600000,
    };
  });
}

describe('CandleStreamNode', () => {
  const node = new CandleStreamNode();

  it('__candles 입력을 candles 출력으로 전달해야 한다', () => {
    const candles = generateCandles(5);
    const result = node.execute({ __candles: candles }, {});
    expect(result.output.candles).toEqual(candles);
  });

  it('__candles가 없으면 빈 배열을 반환해야 한다', () => {
    const result = node.execute({}, {});
    expect(result.output.candles).toEqual([]);
  });
});

describe('RsiNode', () => {
  const node = new RsiNode();

  it('충분한 데이터로 RSI 숫자를 계산해야 한다', () => {
    const candles = generateCandles(30, 'down');
    const result = node.execute({ candles }, { period: 14 });
    expect(typeof result.output.value).toBe('number');
    expect(result.output.value).not.toBeNaN();
  });

  it('하락 추세에서 낮은 RSI를 반환해야 한다', () => {
    const candles = generateCandles(30, 'down');
    const result = node.execute({ candles }, { period: 14 });
    expect(result.output.value as number).toBeLessThan(50);
  });

  it('상승 추세에서 높은 RSI를 반환해야 한다', () => {
    const candles = generateCandles(30, 'up');
    const result = node.execute({ candles }, { period: 14 });
    expect(result.output.value as number).toBeGreaterThan(50);
  });

  it('데이터가 부족하면 NaN을 반환해야 한다', () => {
    const candles = generateCandles(5);
    const result = node.execute({ candles }, { period: 14 });
    expect(result.output.value).toBeNaN();
  });

  it('캔들이 없으면 NaN을 반환해야 한다', () => {
    const result = node.execute({ candles: undefined }, { period: 14 });
    expect(result.output.value).toBeNaN();
  });

  it('기본 period가 14여야 한다', () => {
    const candles = generateCandles(30, 'down');
    const result = node.execute({ candles }, {});
    expect(typeof result.output.value).toBe('number');
  });
});

describe('ThresholdNode', () => {
  const node = new ThresholdNode();

  it('값이 임계값 미만이면 true를 반환해야 한다 (< 연산자)', () => {
    const result = node.execute({ value: 25 }, { operator: '<', threshold: 30 });
    expect(result.output.result).toBe(true);
  });

  it('값이 임계값 이상이면 false를 반환해야 한다 (< 연산자)', () => {
    const result = node.execute({ value: 35 }, { operator: '<', threshold: 30 });
    expect(result.output.result).toBe(false);
  });

  it('> 연산자가 올바르게 동작해야 한다', () => {
    expect(node.execute({ value: 75 }, { operator: '>', threshold: 70 }).output.result).toBe(true);
    expect(node.execute({ value: 65 }, { operator: '>', threshold: 70 }).output.result).toBe(false);
  });

  it('<= 연산자가 올바르게 동작해야 한다', () => {
    expect(node.execute({ value: 30 }, { operator: '<=', threshold: 30 }).output.result).toBe(true);
    expect(node.execute({ value: 31 }, { operator: '<=', threshold: 30 }).output.result).toBe(
      false,
    );
  });

  it('>= 연산자가 올바르게 동작해야 한다', () => {
    expect(node.execute({ value: 70 }, { operator: '>=', threshold: 70 }).output.result).toBe(true);
    expect(node.execute({ value: 69 }, { operator: '>=', threshold: 70 }).output.result).toBe(
      false,
    );
  });

  it('== 연산자가 올바르게 동작해야 한다', () => {
    expect(node.execute({ value: 30 }, { operator: '==', threshold: 30 }).output.result).toBe(true);
    expect(node.execute({ value: 31 }, { operator: '==', threshold: 30 }).output.result).toBe(
      false,
    );
  });

  it('NaN 값이면 false를 반환해야 한다', () => {
    const result = node.execute({ value: NaN }, { operator: '<', threshold: 30 });
    expect(result.output.result).toBe(false);
  });

  it('기본 연산자가 <이고 기본 임계값이 30이어야 한다', () => {
    const result = node.execute({ value: 25 }, {});
    expect(result.output.result).toBe(true);
  });
});

describe('MarketOrderNode', () => {
  const node = new MarketOrderNode();

  it('trigger가 true이면 주문 액션을 생성해야 한다', () => {
    const result = node.execute({ trigger: true }, { side: 'buy', amount: '0.01' });
    expect(result.output.result).toBeDefined();
    const order = result.output.result as Record<string, unknown>;
    expect(order.action).toBe('order');
    expect(order.side).toBe('buy');
    expect(order.amount).toBe('0.01');
    expect(order.type).toBe('market');
  });

  it('trigger가 false이면 null을 반환해야 한다', () => {
    const result = node.execute({ trigger: false }, { side: 'buy', amount: '0.01' });
    expect(result.output.result).toBeNull();
  });

  it('기본 side가 buy이고 기본 amount가 0.001이어야 한다', () => {
    const result = node.execute({ trigger: true }, {});
    const order = result.output.result as Record<string, unknown>;
    expect(order.side).toBe('buy');
    expect(order.amount).toBe('0.001');
  });
});

describe('MacdNode', () => {
  const node = new MacdNode();

  it('충분한 데이터로 MACD, signal, histogram을 계산해야 한다', () => {
    const candles = generateCandles(50, 'up');
    const result = node.execute({ candles }, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    expect(typeof result.output.macd).toBe('number');
    expect(typeof result.output.signal).toBe('number');
    expect(typeof result.output.histogram).toBe('number');
    expect(result.output.macd).not.toBeNaN();
  });

  it('데이터가 부족하면 NaN을 반환해야 한다', () => {
    const candles = generateCandles(20);
    const result = node.execute({ candles }, { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 });
    expect(result.output.macd).toBeNaN();
    expect(result.output.signal).toBeNaN();
  });

  it('캔들이 없으면 NaN을 반환해야 한다', () => {
    const result = node.execute({ candles: undefined }, {});
    expect(result.output.macd).toBeNaN();
  });
});

describe('BollingerNode', () => {
  const node = new BollingerNode();

  it('충분한 데이터로 upper, middle, lower를 계산해야 한다', () => {
    const candles = generateCandles(30);
    const result = node.execute({ candles }, { period: 20, stdDev: 2 });
    expect(typeof result.output.upper).toBe('number');
    expect(typeof result.output.middle).toBe('number');
    expect(typeof result.output.lower).toBe('number');
    expect(result.output.upper as number).toBeGreaterThan(result.output.lower as number);
  });

  it('데이터가 부족하면 NaN을 반환해야 한다', () => {
    const candles = generateCandles(10);
    const result = node.execute({ candles }, { period: 20, stdDev: 2 });
    expect(result.output.upper).toBeNaN();
  });
});

describe('EmaNode', () => {
  const node = new EmaNode();

  it('충분한 데이터로 EMA를 계산해야 한다', () => {
    const candles = generateCandles(30, 'up');
    const result = node.execute({ candles }, { period: 20 });
    expect(typeof result.output.value).toBe('number');
    expect(result.output.value).not.toBeNaN();
  });

  it('데이터가 부족하면 NaN을 반환해야 한다', () => {
    const candles = generateCandles(5);
    const result = node.execute({ candles }, { period: 20 });
    expect(result.output.value).toBeNaN();
  });
});

describe('CrossoverNode', () => {
  const node = new CrossoverNode();

  it('value_a가 value_b 위로 크로스하면 true를 반환해야 한다 (above)', () => {
    const state1 = node.execute({ value_a: 10, value_b: 12 }, { direction: 'above' }, null);
    const result = node.execute({ value_a: 14, value_b: 12 }, { direction: 'above' }, state1.state);
    expect(result.output.result).toBe(true);
  });

  it('크로스 없이 동일한 방향이면 false를 반환해야 한다', () => {
    const state1 = node.execute({ value_a: 15, value_b: 12 }, { direction: 'above' }, null);
    const result = node.execute({ value_a: 16, value_b: 12 }, { direction: 'above' }, state1.state);
    expect(result.output.result).toBe(false);
  });

  it('value_a가 value_b 아래로 크로스하면 true를 반환해야 한다 (below)', () => {
    const state1 = node.execute({ value_a: 14, value_b: 12 }, { direction: 'below' }, null);
    const result = node.execute({ value_a: 10, value_b: 12 }, { direction: 'below' }, state1.state);
    expect(result.output.result).toBe(true);
  });

  it('이전 상태가 없으면 false를 반환해야 한다', () => {
    const result = node.execute({ value_a: 14, value_b: 12 }, { direction: 'above' }, null);
    expect(result.output.result).toBe(false);
  });

  it('NaN 입력이면 false를 반환해야 한다', () => {
    const result = node.execute({ value_a: NaN, value_b: 12 }, { direction: 'above' }, null);
    expect(result.output.result).toBe(false);
  });
});

describe('AndOrNode', () => {
  const node = new AndOrNode();

  it('AND: 둘 다 true이면 true를 반환해야 한다', () => {
    expect(node.execute({ a: true, b: true }, { operator: 'AND' }).output.result).toBe(true);
  });

  it('AND: 하나라도 false이면 false를 반환해야 한다', () => {
    expect(node.execute({ a: true, b: false }, { operator: 'AND' }).output.result).toBe(false);
    expect(node.execute({ a: false, b: true }, { operator: 'AND' }).output.result).toBe(false);
  });

  it('OR: 하나라도 true이면 true를 반환해야 한다', () => {
    expect(node.execute({ a: true, b: false }, { operator: 'OR' }).output.result).toBe(true);
    expect(node.execute({ a: false, b: true }, { operator: 'OR' }).output.result).toBe(true);
  });

  it('OR: 둘 다 false이면 false를 반환해야 한다', () => {
    expect(node.execute({ a: false, b: false }, { operator: 'OR' }).output.result).toBe(false);
  });

  it('기본 operator가 AND여야 한다', () => {
    expect(node.execute({ a: true, b: true }, {}).output.result).toBe(true);
    expect(node.execute({ a: true, b: false }, {}).output.result).toBe(false);
  });
});

describe('AlertNode', () => {
  const node = new AlertNode();

  it('trigger가 true이면 alert 액션을 생성해야 한다', () => {
    const result = node.execute({ trigger: true }, { message: '매수 신호!' });
    const alert = result.output.result as Record<string, unknown>;
    expect(alert.action).toBe('alert');
    expect(alert.message).toBe('매수 신호!');
  });

  it('trigger가 false이면 빈 출력을 반환해야 한다', () => {
    const result = node.execute({ trigger: false }, { message: '매수 신호!' });
    expect(result.output.result).toBeUndefined();
  });
});
