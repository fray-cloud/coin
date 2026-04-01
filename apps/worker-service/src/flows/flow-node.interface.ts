import type { PortType } from '@coin/types';

export interface FlowNodePort {
  name: string;
  type: PortType;
}

export interface FlowNodeExecuteResult {
  output: Record<string, unknown>;
  state?: unknown;
}

export interface IFlowNode {
  readonly subtype: string;
  readonly inputs: FlowNodePort[];
  readonly outputs: FlowNodePort[];
  execute(
    input: Record<string, unknown>,
    config: Record<string, unknown>,
    state?: unknown,
  ): FlowNodeExecuteResult;
}
