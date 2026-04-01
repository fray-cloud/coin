'use client';

import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type IsValidConnection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { NODE_TYPE_REGISTRY, getRequiredConfig } from '@coin/types';
import { useFlowStore, type FlowNodeData } from '@/stores/use-flow-store';
import { customNodeTypes } from './nodes/base-node';

let dropCounter = 0;

export function FlowCanvas() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const setSelectedNode = useFlowStore((s) => s.setSelectedNode);
  const addNode = useFlowStore((s) => s.addNode);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  // Validate connections by checking port type compatibility
  const isValidConnection: IsValidConnection = useCallback(
    (
      connection:
        | Connection
        | {
            source: string;
            target: string;
            sourceHandle?: string | null;
            targetHandle?: string | null;
          },
    ) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return false;

      const sourceReg = NODE_TYPE_REGISTRY[sourceNode.data.subtype];
      const targetReg = NODE_TYPE_REGISTRY[targetNode.data.subtype];
      if (!sourceReg || !targetReg) return false;

      const sourcePort = sourceReg.outputs.find(
        (p) => p.name === (connection.sourceHandle || sourceReg.outputs[0]?.name),
      );
      const targetPort = targetReg.inputs.find(
        (p) => p.name === (connection.targetHandle || targetReg.inputs[0]?.name),
      );

      if (!sourcePort || !targetPort) return false;
      return sourcePort.type === targetPort.type;
    },
    [nodes],
  );

  // Handle drag & drop from palette
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const subtype = e.dataTransfer.getData('application/reactflow-subtype');
      if (!subtype) return;

      const info = NODE_TYPE_REGISTRY[subtype];
      if (!info) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: e.clientX - bounds.left - 80,
        y: e.clientY - bounds.top - 20,
      };

      addNode({
        id: `${subtype}-drop-${++dropCounter}`,
        type: info.type,
        position,
        data: {
          label: info.label,
          subtype: info.subtype,
          nodeType: info.type,
          config: getRequiredConfig(info),
        },
      });
    },
    [addNode],
  );

  const isEmpty = nodes.length === 0;

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 relative"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Empty canvas guide overlay */}
      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="text-center px-6 py-8 rounded-xl border border-dashed border-border/50 bg-card/40 backdrop-blur-sm max-w-sm">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="text-sm font-semibold text-foreground mb-1">플로우를 시작해보세요</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
              왼쪽 패널에서 노드를 클릭하거나 캔버스로 드래그해 추가하세요.
            </p>
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                <span>데이터 노드로 시작 (예: 캔들 데이터)</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                <span>지표 노드로 RSI, MACD 등 계산</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                <span>조건 노드로 매매 신호 정의</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                <span>주문 노드로 자동 매매 실행</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        nodeTypes={customNodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 3' }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#4b5563', strokeWidth: 2 },
        }}
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <Background color="var(--color-border)" gap={20} />
        <Controls className="!bg-card !border-border [&>button]:!bg-muted [&>button]:!border-border [&>button]:!text-muted-foreground [&>button:hover]:!bg-muted/80" />
        <MiniMap
          nodeColor={(n) => {
            const type = (n.data as FlowNodeData)?.nodeType;
            if (type === 'data') return '#3b82f6';
            if (type === 'indicator') return '#8b5cf6';
            if (type === 'condition') return '#f59e0b';
            if (type === 'order') return '#10b981';
            return '#64748b';
          }}
          style={{ backgroundColor: 'var(--color-background)' }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
