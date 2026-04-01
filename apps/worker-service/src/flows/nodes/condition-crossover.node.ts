import type { IFlowNode, FlowNodeExecuteResult } from '../flow-node.interface';

/**
 * Crossover node: detects when value_a crosses value_b.
 * Uses state to remember the previous values for crossover detection.
 *
 * direction = 'above': fires when value_a crosses above value_b (bullish)
 * direction = 'below': fires when value_a crosses below value_b (bearish)
 */
export class CrossoverNode implements IFlowNode {
  readonly subtype = 'crossover';
  readonly inputs = [
    { name: 'value_a', type: 'number' as const },
    { name: 'value_b', type: 'number' as const },
  ];
  readonly outputs = [{ name: 'result', type: 'boolean' as const }];

  execute(
    input: Record<string, unknown>,
    config: Record<string, unknown>,
    state?: unknown,
  ): FlowNodeExecuteResult {
    const value_a = input.value_a as number;
    const value_b = input.value_b as number;
    const direction = (config.direction as string) || 'above';

    if (
      typeof value_a !== 'number' ||
      typeof value_b !== 'number' ||
      isNaN(value_a) ||
      isNaN(value_b)
    ) {
      return { output: { result: false }, state: state ?? null };
    }

    const prev = state as { value_a: number; value_b: number } | null;

    let result = false;
    if (prev && typeof prev.value_a === 'number' && typeof prev.value_b === 'number') {
      if (direction === 'above') {
        // value_a was below value_b, now above
        result = prev.value_a <= prev.value_b && value_a > value_b;
      } else {
        // value_a was above value_b, now below
        result = prev.value_a >= prev.value_b && value_a < value_b;
      }
    }

    return {
      output: { result },
      state: { value_a, value_b },
    };
  }
}
