import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class MarketOrderNode implements IFlowNode {
  readonly subtype = 'market-order';
  readonly inputs = [{ name: 'trigger', type: 'boolean' as const }];
  readonly outputs = [{ name: 'result', type: 'OrderResult' as const }];

  execute(input: Record<string, unknown>, config: Record<string, unknown>): FlowNodeExecuteResult {
    const trigger = input.trigger as boolean;
    const side = (config.side as string) || 'buy';
    const amount = (config.amount as string) || '0.001';

    if (!trigger) {
      return { output: { result: null } };
    }

    return {
      output: {
        result: {
          action: 'order',
          side,
          amount,
          type: 'market',
        },
      },
    };
  }
}
