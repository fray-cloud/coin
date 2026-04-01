import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

export class ThresholdNode implements IFlowNode {
  readonly subtype = 'threshold';
  readonly inputs = [{ name: 'value', type: 'number' as const }];
  readonly outputs = [{ name: 'result', type: 'boolean' as const }];

  execute(input: Record<string, unknown>, config: Record<string, unknown>): FlowNodeExecuteResult {
    const value = input.value as number;
    const threshold = (config.threshold as number) ?? 30;
    const operator = (config.operator as string) || '<';

    if (typeof value !== 'number' || isNaN(value)) {
      return { output: { result: false } };
    }

    let result = false;
    switch (operator) {
      case '<':
        result = value < threshold;
        break;
      case '>':
        result = value > threshold;
        break;
      case '<=':
        result = value <= threshold;
        break;
      case '>=':
        result = value >= threshold;
        break;
      case '==':
        result = value === threshold;
        break;
      default:
        result = false;
    }

    return { output: { result } };
  }
}
