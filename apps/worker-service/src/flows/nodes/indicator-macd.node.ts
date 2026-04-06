import { MACD } from 'technicalindicators';
import type { Candle } from '@coin/types';
import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class MacdNode implements IFlowNode {
  readonly subtype = 'macd';
  readonly inputs = [{ name: 'candles', type: 'Candle[]' as const }];
  readonly outputs = [
    { name: 'macd', type: 'number' as const },
    { name: 'signal', type: 'number' as const },
    { name: 'histogram', type: 'number' as const },
  ];

  execute(input: Record<string, unknown>, config: Record<string, unknown>): FlowNodeExecuteResult {
    const candles = input.candles as Candle[];
    const fastPeriod = (config.fastPeriod as number) || 12;
    const slowPeriod = (config.slowPeriod as number) || 26;
    const signalPeriod = (config.signalPeriod as number) || 9;
    const minDataPoints = slowPeriod + signalPeriod;

    if (!candles || candles.length < minDataPoints) {
      return { output: { macd: NaN, signal: NaN, histogram: NaN } };
    }

    const closePrices = candles.map((c) => parseFloat(c.close));
    const macdValues = MACD.calculate({
      values: closePrices,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    if (macdValues.length === 0) {
      return { output: { macd: NaN, signal: NaN, histogram: NaN } };
    }

    const current = macdValues[macdValues.length - 1];
    if (current.MACD == null || current.signal == null) {
      return { output: { macd: NaN, signal: NaN, histogram: NaN } };
    }

    return {
      output: {
        macd: Math.round(current.MACD * 10000) / 10000,
        signal: Math.round(current.signal * 10000) / 10000,
        histogram: Math.round((current.histogram ?? 0) * 10000) / 10000,
      },
    };
  }
}
