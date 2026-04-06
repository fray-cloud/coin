import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class AlertNode implements IFlowNode {
  readonly subtype = 'alert';
  readonly inputs = [{ name: 'trigger', type: 'boolean' as const }];
  readonly outputs = [];

  execute(input: Record<string, unknown>, config: Record<string, unknown>): FlowNodeExecuteResult {
    const trigger = Boolean(input.trigger);
    const message = (config.message as string) || 'Signal triggered!';

    if (!trigger) {
      return { output: {} };
    }

    // Emit an alert action — the execution context can pick this up
    return {
      output: {
        result: {
          action: 'alert',
          message,
        },
      },
    };
  }
}
