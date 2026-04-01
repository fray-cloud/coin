import { BollingerBands } from 'technicalindicators';
import type { Candle } from '@coin/types';
import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class BollingerNode implements IFlowNode {
  readonly subtype = 'bollinger';
  readonly inputs = [{ name: 'candles', type: 'Candle[]' as const }];
  readonly outputs = [
    { name: 'upper', type: 'number' as const },
    { name: 'middle', type: 'number' as const },
    { name: 'lower', type: 'number' as const },
  ];

  execute(input: Record<string, unknown>, config: Record<string, unknown>): FlowNodeExecuteResult {
    const candles = input.candles as Candle[];
    const period = (config.period as number) || 20;
    const stdDev = (config.stdDev as number) || 2;

    if (!candles || candles.length < period) {
      return { output: { upper: NaN, middle: NaN, lower: NaN } };
    }

    const closePrices = candles.map((c) => parseFloat(c.close));
    const bbValues = BollingerBands.calculate({ values: closePrices, period, stdDev });

    if (bbValues.length === 0) {
      return { output: { upper: NaN, middle: NaN, lower: NaN } };
    }

    const current = bbValues[bbValues.length - 1];
    return {
      output: {
        upper: Math.round(current.upper * 100) / 100,
        middle: Math.round(current.middle * 100) / 100,
        lower: Math.round(current.lower * 100) / 100,
      },
    };
  }
}
