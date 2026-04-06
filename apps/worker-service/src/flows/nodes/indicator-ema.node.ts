import { EMA } from 'technicalindicators';
import type { Candle } from '@coin/types';
import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class EmaNode implements IFlowNode {
  readonly subtype = 'ema';
  readonly inputs = [{ name: 'candles', type: 'Candle[]' as const }];
  readonly outputs = [{ name: 'value', type: 'number' as const }];

  execute(input: Record<string, unknown>, config: Record<string, unknown>): FlowNodeExecuteResult {
    const candles = input.candles as Candle[];
    const period = (config.period as number) || 20;

    if (!candles || candles.length < period) {
      return { output: { value: NaN } };
    }

    const closePrices = candles.map((c) => parseFloat(c.close));
    const emaValues = EMA.calculate({ values: closePrices, period });

    if (emaValues.length === 0) {
      return { output: { value: NaN } };
    }

    return {
      output: { value: Math.round(emaValues[emaValues.length - 1] * 100) / 100 },
    };
  }
}
