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

import { NODE_TYPE_REGISTRY } from '@coin/types';
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
          config: { ...info.defaultConfig },
        },
      });
    },
    [addNode],
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        nodeTypes={customNodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
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
