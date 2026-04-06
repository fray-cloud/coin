import type {
  FlowDefinition,
  FlowNodeDefinition,
  FlowEdgeDefinition,
  FlowExecutionTraceEntry,
  FlowOrderAction,
  Candle,
} from '@coin/types';
import { FLOW_LIMITS, NODE_TYPE_REGISTRY } from '@coin/types';
import { NODE_REGISTRY } from './nodes';

export interface FlowExecutionContext {
  nodeStates: Record<string, unknown>;
}

export interface CompiledFlowResult {
  traces: FlowExecutionTraceEntry[];
  actions: FlowOrderAction[];
}

export interface CompiledFlow {
  execute(candles: Candle[], context: FlowExecutionContext): CompiledFlowResult;
}

export class FlowValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'FlowValidationError';
  }
}

export class FlowCompiler {
  validate(definition: FlowDefinition): void {
    const { nodes, edges } = definition;

    if (!nodes || nodes.length === 0) {
      throw new FlowValidationError('Flow must have at least one node', 'EMPTY_NODES');
    }

    if (nodes.length > FLOW_LIMITS.MAX_NODES) {
      throw new FlowValidationError(
        `Flow exceeds maximum of ${FLOW_LIMITS.MAX_NODES} nodes`,
        'MAX_NODES_EXCEEDED',
      );
    }

    if (edges && edges.length > FLOW_LIMITS.MAX_EDGES) {
      throw new FlowValidationError(
        `Flow exceeds maximum of ${FLOW_LIMITS.MAX_EDGES} edges`,
        'MAX_EDGES_EXCEEDED',
      );
    }

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of nodes) {
      if (nodeIds.has(node.id)) {
        throw new FlowValidationError(`Duplicate node ID: ${node.id}`, 'DUPLICATE_NODE_ID');
      }
      nodeIds.add(node.id);
    }

    // Check node subtypes exist in registry
    for (const node of nodes) {
      if (!NODE_REGISTRY[node.subtype]) {
        throw new FlowValidationError(
          `Unknown node subtype: ${node.subtype}`,
          'UNKNOWN_NODE_SUBTYPE',
        );
      }
    }

    // Check edges reference valid nodes
    for (const edge of edges || []) {
      if (!nodeIds.has(edge.source)) {
        throw new FlowValidationError(
          `Edge source "${edge.source}" not found`,
          'INVALID_EDGE_SOURCE',
        );
      }
      if (!nodeIds.has(edge.target)) {
        throw new FlowValidationError(
          `Edge target "${edge.target}" not found`,
          'INVALID_EDGE_TARGET',
        );
      }
    }

    // Check for at least one data source and one terminal node (before structural checks)
    const hasDataSource = nodes.some((n) => n.type === 'data');
    if (!hasDataSource) {
      throw new FlowValidationError(
        'Flow must have at least one data source node',
        'NO_DATA_SOURCE',
      );
    }

    const hasTerminal = nodes.some((n) => n.type === 'order');
    if (!hasTerminal) {
      throw new FlowValidationError(
        'Flow must have at least one order or alert node',
        'NO_TERMINAL_NODE',
      );
    }

    // Check for required inputs
    this.validateRequiredInputs(nodes, edges || []);

    // DAG check (cycle detection via Kahn's algorithm) — before type check
    this.validateDAG(nodes, edges || []);

    // Check for type compatibility
    this.validateEdgeTypes(nodes, edges || []);
  }

  private validateRequiredInputs(nodes: FlowNodeDefinition[], edges: FlowEdgeDefinition[]): void {
    const incomingByNode = new Map<string, Set<string>>();

    for (const edge of edges) {
      if (!incomingByNode.has(edge.target)) {
        incomingByNode.set(edge.target, new Set());
      }
      const handle = edge.targetHandle || 'default';
      incomingByNode.get(edge.target)!.add(handle);
    }

    for (const node of nodes) {
      const typeInfo = NODE_TYPE_REGISTRY[node.subtype];
      if (!typeInfo) continue;

      const requiredInputs = typeInfo.inputs.filter((i) => i.required !== false);
      const connectedHandles = incomingByNode.get(node.id) || new Set();

      for (const input of requiredInputs) {
        if (!connectedHandles.has(input.name) && !connectedHandles.has('default')) {
          throw new FlowValidationError(
            `Node "${node.id}" (${node.subtype}) is missing required input "${input.name}"`,
            'MISSING_REQUIRED_INPUT',
          );
        }
      }
    }
  }

  private validateEdgeTypes(nodes: FlowNodeDefinition[], edges: FlowEdgeDefinition[]): void {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source)!;
      const targetNode = nodeMap.get(edge.target)!;

      const sourceTypeInfo = NODE_TYPE_REGISTRY[sourceNode.subtype];
      const targetTypeInfo = NODE_TYPE_REGISTRY[targetNode.subtype];
      if (!sourceTypeInfo || !targetTypeInfo) continue;

      const sourceHandle = edge.sourceHandle || sourceTypeInfo.outputs[0]?.name;
      const targetHandle = edge.targetHandle || targetTypeInfo.inputs[0]?.name;

      const sourcePort = sourceTypeInfo.outputs.find((o) => o.name === sourceHandle);
      const targetPort = targetTypeInfo.inputs.find((i) => i.name === targetHandle);

      if (sourcePort && targetPort && sourcePort.type !== targetPort.type) {
        throw new FlowValidationError(
          `Type mismatch: ${sourceNode.subtype}.${sourceHandle} (${sourcePort.type}) → ${targetNode.subtype}.${targetHandle} (${targetPort.type})`,
          'TYPE_MISMATCH',
        );
      }
    }
  }

  private validateDAG(nodes: FlowNodeDefinition[], edges: FlowEdgeDefinition[]): void {
    // Kahn's algorithm for cycle detection
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    let processed = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      processed++;
      for (const neighbor of adjacency.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (processed !== nodes.length) {
      throw new FlowValidationError('Flow contains a cycle', 'CYCLE_DETECTED');
    }
  }

  compile(definition: FlowDefinition): CompiledFlow {
    this.validate(definition);

    const sortedNodeIds = this.topologicalSort(definition.nodes, definition.edges);
    const nodeMap = new Map(definition.nodes.map((n) => [n.id, n]));
    const edgesByTarget = this.groupEdgesByTarget(definition.edges);

    return {
      execute(candles: Candle[], context: FlowExecutionContext): CompiledFlowResult {
        const traces: FlowExecutionTraceEntry[] = [];
        const actions: FlowOrderAction[] = [];
        const nodeOutputs = new Map<string, Record<string, unknown>>();

        for (const nodeId of sortedNodeIds) {
          const nodeDef = nodeMap.get(nodeId)!;
          const nodeImpl = NODE_REGISTRY[nodeDef.subtype];
          if (!nodeImpl) continue;

          // Gather inputs from upstream edges
          const input: Record<string, unknown> = {};
          const incomingEdges = edgesByTarget.get(nodeId) || [];

          for (const edge of incomingEdges) {
            const sourceOutput = nodeOutputs.get(edge.source);
            if (sourceOutput) {
              const sourceHandle =
                edge.sourceHandle ||
                NODE_TYPE_REGISTRY[nodeMap.get(edge.source)!.subtype]?.outputs[0]?.name;
              const targetHandle =
                edge.targetHandle || NODE_TYPE_REGISTRY[nodeDef.subtype]?.inputs[0]?.name;
              if (sourceHandle && targetHandle) {
                input[targetHandle] = sourceOutput[sourceHandle];
              }
            }
          }

          // Inject candles for data source nodes
          if (nodeDef.type === 'data') {
            input.__candles = candles;
          }

          const startTime = performance.now();
          const result = nodeImpl.execute(input, nodeDef.config, context.nodeStates[nodeId]);
          const durationMs = Math.round(performance.now() - startTime);

          // Save state for stateful nodes
          if (result.state !== undefined) {
            context.nodeStates[nodeId] = result.state;
          }

          nodeOutputs.set(nodeId, result.output);

          // Determine if the node "fired" (produced meaningful output)
          const fired = determineFired(nodeDef, result.output);

          traces.push({
            timestamp:
              candles.length > 0
                ? new Date(candles[candles.length - 1].timestamp).toISOString()
                : new Date().toISOString(),
            nodeId,
            input: sanitizeForTrace(input),
            output: result.output,
            fired,
            durationMs,
          });

          // Collect order actions
          if (nodeDef.type === 'order' && result.output.result) {
            const orderResult = result.output.result as Record<string, unknown>;
            if (orderResult.action === 'order') {
              actions.push({
                nodeId,
                side: orderResult.side as 'buy' | 'sell',
                amount: orderResult.amount as string,
                type: (orderResult.type as 'market' | 'limit') || 'market',
                price: orderResult.price as string | undefined,
              });
            }
          }
        }

        return { traces, actions };
      },
    };
  }

  private topologicalSort(nodes: FlowNodeDefinition[], edges: FlowEdgeDefinition[]): string[] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const neighbor of adjacency.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return sorted;
  }

  private groupEdgesByTarget(edges: FlowEdgeDefinition[]): Map<string, FlowEdgeDefinition[]> {
    const map = new Map<string, FlowEdgeDefinition[]>();
    for (const edge of edges) {
      if (!map.has(edge.target)) map.set(edge.target, []);
      map.get(edge.target)!.push(edge);
    }
    return map;
  }
}

function determineFired(nodeDef: FlowNodeDefinition, output: Record<string, unknown>): boolean {
  switch (nodeDef.type) {
    case 'data':
      return true;
    case 'indicator':
      // Single-output indicators use 'value'; multi-output (MACD, Bollinger) check any number output
      return Object.values(output).some((v) => typeof v === 'number' && !isNaN(v));
    case 'condition':
      return output.result === true;
    case 'order':
      return output.result != null;
    default:
      return false;
  }
}

function sanitizeForTrace(input: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === '__candles') continue;
    if (Array.isArray(value) && value.length > 5) {
      sanitized[key] = `[Array(${value.length})]`;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
