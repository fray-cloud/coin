import { RSI } from 'technicalindicators';
import type { Candle } from '@coin/types';
import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class RsiNode implements IFlowNode {
  readonly subtype = 'rsi';
  readonly inputs = [{ name: 'candles', type: 'Candle[]' as const }];
  readonly outputs = [{ name: 'value', type: 'number' as const }];

  execute(input: Record<string, unknown>, config: Record<string, unknown>): FlowNodeExecuteResult {
    const candles = input.candles as Candle[];
    const period = (config.period as number) || 14;

    if (!candles || candles.length < period + 1) {
      return { output: { value: NaN } };
    }

    const closePrices = candles.map((c) => parseFloat(c.close));
    const rsiValues = RSI.calculate({ values: closePrices, period });

    if (rsiValues.length === 0) {
      return { output: { value: NaN } };
    }

    const currentRsi = rsiValues[rsiValues.length - 1];
    return {
      output: { value: Math.round(currentRsi * 100) / 100 },
    };
  }
}
