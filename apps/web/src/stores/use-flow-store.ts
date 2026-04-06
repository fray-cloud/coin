import { create } from 'zustand';
import type { Node, Edge, Connection, NodeChange, EdgeChange } from '@xyflow/react';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { FlowDefinition, FlowNodeDefinition, NODE_TYPE_REGISTRY } from '@coin/types';
import type { BacktestTraceItem } from '@/lib/api-client';

export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  subtype: string;
  nodeType: FlowNodeDefinition['type'];
  config: Record<string, unknown>;
}

interface FlowState {
  // Canvas state
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;

  // Backtest state
  activeBacktestId: string | null;
  backtestStatus: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  traceData: BacktestTraceItem[];
  timelineIndex: number;

  // Flow metadata
  flowId: string | null;
  flowName: string;
  isDirty: boolean;

  // Actions
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setSelectedNode: (id: string | null) => void;
  addNode: (node: Node<FlowNodeData>) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  deleteNode: (nodeId: string) => void;

  // Flow I/O
  loadFlow: (id: string, name: string, definition: FlowDefinition) => void;
  toDefinition: () => FlowDefinition;
  reset: () => void;
  setFlowName: (name: string) => void;
  markClean: () => void;

  // Backtest
  setActiveBacktest: (id: string | null, status: FlowState['backtestStatus']) => void;
  setTraceData: (data: BacktestTraceItem[]) => void;
  setTimelineIndex: (index: number) => void;
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  activeBacktestId: null,
  backtestStatus: 'idle',
  traceData: [],
  timelineIndex: 0,
  flowId: null,
  flowName: '',
  isDirty: false,

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<FlowNodeData>[],
      isDirty: true,
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as Edge[],
      isDirty: true,
    })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(connection, state.edges),
      isDirty: true,
    })),

  setSelectedNode: (id) => set({ selectedNodeId: id }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    })),

  updateNodeConfig: (nodeId, config) =>
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const merged = { ...n.data.config };
        for (const [k, v] of Object.entries(config)) {
          if (v === undefined) {
            delete merged[k];
          } else {
            merged[k] = v;
          }
        }
        return { ...n, data: { ...n.data, config: merged } };
      }),
      isDirty: true,
    })),

  deleteNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    })),

  loadFlow: (id, name, definition) => {
    const nodes: Node<FlowNodeData>[] = definition.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        label: n.subtype,
        subtype: n.subtype,
        nodeType: n.type,
        config: n.config,
      },
    }));
    const edges: Edge[] = definition.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));
    set({
      flowId: id,
      flowName: name,
      nodes,
      edges,
      selectedNodeId: null,
      isDirty: false,
      activeBacktestId: null,
      backtestStatus: 'idle',
      traceData: [],
      timelineIndex: 0,
    });
  },

  toDefinition: (): FlowDefinition => {
    const { nodes, edges } = get();
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.data.nodeType,
        subtype: n.data.subtype,
        position: n.position,
        config: n.data.config,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
      })),
    };
  },

  reset: () =>
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      activeBacktestId: null,
      backtestStatus: 'idle',
      traceData: [],
      timelineIndex: 0,
      flowId: null,
      flowName: '',
      isDirty: false,
    }),

  setFlowName: (name) => set({ flowName: name, isDirty: true }),
  markClean: () => set({ isDirty: false }),

  setActiveBacktest: (id, status) => set({ activeBacktestId: id, backtestStatus: status }),

  setTraceData: (data) => set({ traceData: data }),
  setTimelineIndex: (index) => set({ timelineIndex: index }),
}));
