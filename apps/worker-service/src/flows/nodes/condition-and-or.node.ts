import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class AndOrNode implements IFlowNode {
  readonly subtype = 'and-or';
  readonly inputs = [
    { name: 'a', type: 'boolean' as const },
    { name: 'b', type: 'boolean' as const },
  ];
  readonly outputs = [{ name: 'result', type: 'boolean' as const }];

  execute(input: Record<string, unknown>, config: Record<string, unknown>): FlowNodeExecuteResult {
    const a = Boolean(input.a);
    const b = Boolean(input.b);
    const operator = (config.operator as string) || 'AND';

    const result = operator === 'AND' ? a && b : a || b;
    return { output: { result } };
  }
}
