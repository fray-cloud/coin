import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class CandleStreamNode implements IFlowNode {
  readonly subtype = 'candle-stream';
  readonly inputs = [];
  readonly outputs = [{ name: 'candles', type: 'Candle[]' as const }];

  execute(input: Record<string, unknown>, _config: Record<string, unknown>): FlowNodeExecuteResult {
    return {
      output: { candles: input.__candles ?? [] },
    };
  }
}
