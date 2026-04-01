import { describe, it, expect } from 'vitest';
import type { Candle } from '@coin/types';
import { CandleStreamNode } from '../nodes/data-candle-stream.node';
import { RsiNode } from '../nodes/indicator-rsi.node';
import { ThresholdNode } from '../nodes/condition-threshold.node';
import { MarketOrderNode } from '../nodes/order-market.node';

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
