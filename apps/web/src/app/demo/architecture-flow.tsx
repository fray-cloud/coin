'use client';

import { useEffect, useState } from 'react';
import {
  ReactFlow,
  BaseEdge,
  Handle,
  getSmoothStepPath,
  type Node,
  type Edge,
  type EdgeProps,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Globe, Monitor, Server, Cog, Database, ArrowRightLeft, CircleDot } from 'lucide-react';
import type { ComponentType } from 'react';

// --- Icons ---
const ICONS: Record<string, ComponentType<{ size?: number }>> = {
  user: Globe,
  web: Monitor,
  api: Server,
  kafka: ArrowRightLeft,
  worker: Cog,
  upbit: CircleDot,
  binance: CircleDot,
  db: Database,
};

// --- Responsive sizes ---
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

const SIZES = {
  desktop: {
    nodeW: 220,
    nodeH: 56,
    pad: 28,
    gapY: 20,
    iconSize: 18,
    fontSize: 14,
    subFontSize: 11,
  },
  mobile: { nodeW: 160, nodeH: 44, pad: 20, gapY: 14, iconSize: 14, fontSize: 12, subFontSize: 10 },
};

// --- Custom Node ---
const hiddenHandle = {
  background: 'transparent',
  width: 1,
  height: 1,
  border: 'none',
  minWidth: 0,
  minHeight: 0,
};

function ArchNode({
  id,
  data,
}: {
  id: string;
  data: { label: string; sub?: string; s: typeof SIZES.desktop };
}) {
  const Icon = ICONS[id];
  const s = data.s;
  return (
    <div
      style={{
        width: s.nodeW,
        height: s.nodeH,
        background: '#0d0d12',
        border: '1px solid #00d992',
        boxShadow: '0 0 12px rgba(0,217,146,0.2)',
        borderRadius: 10,
        padding: '0 16px',
        color: '#fff',
        fontWeight: 600,
        fontSize: s.fontSize,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
      }}
    >
      <Handle type="target" position={Position.Top} id="top" style={hiddenHandle} />
      <Handle type="target" position={Position.Left} id="left" style={hiddenHandle} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={hiddenHandle} />
      <Handle type="source" position={Position.Right} id="right" style={hiddenHandle} />
      {Icon && <Icon size={s.iconSize} style={{ color: '#00d992', flexShrink: 0 }} />}
      <div>
        {data.label}
        {data.sub && (
          <div style={{ fontSize: s.subFontSize, color: '#71717a', fontWeight: 400, marginTop: 1 }}>
            {data.sub}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Animated Edge ---
function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });
  const dur = `${2.5 + Math.random() * 1.5}s`;
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#1a1a24', strokeWidth: 2 }} />
      <path d={edgePath} fill="none" stroke="#00d992" strokeWidth={1.5} strokeOpacity={0.3} />
      <circle r="3" fill="#00d992" style={{ filter: 'drop-shadow(0 0 6px #00d992)' }}>
        <animateMotion dur={dur} repeatCount="indefinite">
          <mpath xlinkHref={`#${id}`} />
        </animateMotion>
      </circle>
      <path id={id} d={edgePath} fill="none" stroke="none" />
    </>
  );
}

// --- Build layout ---
function buildLayout(s: typeof SIZES.desktop) {
  const { nodeW, nodeH, pad, gapY } = s;

  const cx = (groupW: number, idx = 0, total = 1) => {
    if (total === 1) return (groupW - nodeW) / 2;
    const totalW = total * nodeW + (total - 1) * pad;
    return (groupW - totalW) / 2 + idx * (nodeW + pad);
  };
  const cy = (idx: number) => pad + idx * (nodeH + gapY);

  const gFrontW = nodeW * 2 + pad * 3;
  const gFrontH = nodeH + pad * 2;
  const gBackW = nodeW + pad * 2;
  const gBackH = nodeH * 3 + gapY * 2 + pad * 2;
  const gExchW = nodeW * 2 + pad * 3;
  const gExchH = nodeH + pad * 2;

  const gBackX = gFrontW + 40;
  const gExchX = gBackX - 60;
  const gExchY = gBackH + 40;
  // DB node position: right of Backend group, vertically centered
  const dbX = gBackX + gBackW + 40;
  const dbY = (gBackH - nodeH) / 2;

  const groupStyle = (w: number, h: number): React.CSSProperties => ({
    width: w,
    height: h,
    background: 'transparent',
    border: '1px dashed #2a2a36',
    borderRadius: 14,
    padding: 0,
    fontSize: 11,
    color: '#00d992',
    fontWeight: 500,
    letterSpacing: '0.05em',
  });

  const nodes: Node[] = [
    {
      id: 'g-frontend',
      type: 'group',
      position: { x: 0, y: 0 },
      data: { label: 'Frontend' },
      style: groupStyle(gFrontW, gFrontH),
    },
    {
      id: 'g-backend',
      type: 'group',
      position: { x: gBackX, y: 0 },
      data: { label: 'Backend' },
      style: groupStyle(gBackW, gBackH),
    },
    {
      id: 'g-exchange',
      type: 'group',
      position: { x: gExchX, y: gExchY },
      data: { label: 'Exchanges' },
      style: groupStyle(gExchW, gExchH),
    },

    {
      id: 'user',
      type: 'arch',
      position: { x: cx(gFrontW, 0, 2), y: pad },
      data: { label: 'User', sub: 'Browser', s },
      parentId: 'g-frontend',
    },
    {
      id: 'web',
      type: 'arch',
      position: { x: cx(gFrontW, 1, 2), y: pad },
      data: { label: 'Web', sub: 'Next.js 15', s },
      parentId: 'g-frontend',
    },

    {
      id: 'api',
      type: 'arch',
      position: { x: cx(gBackW), y: cy(0) },
      data: { label: 'API Server', sub: 'NestJS 11', s },
      parentId: 'g-backend',
    },
    {
      id: 'kafka',
      type: 'arch',
      position: { x: cx(gBackW), y: cy(1) },
      data: { label: 'Kafka', sub: 'Event Stream', s },
      parentId: 'g-backend',
    },
    {
      id: 'worker',
      type: 'arch',
      position: { x: cx(gBackW), y: cy(2) },
      data: { label: 'Worker', sub: 'Strategy Engine', s },
      parentId: 'g-backend',
    },

    {
      id: 'db',
      type: 'arch',
      position: { x: dbX, y: dbY },
      data: { label: 'PostgreSQL + Redis', sub: 'Storage & Cache', s },
    },

    {
      id: 'upbit',
      type: 'arch',
      position: { x: cx(gExchW, 0, 2), y: pad },
      data: { label: 'Upbit API', s },
      parentId: 'g-exchange',
    },
    {
      id: 'binance',
      type: 'arch',
      position: { x: cx(gExchW, 1, 2), y: pad },
      data: { label: 'Binance API', s },
      parentId: 'g-exchange',
    },
  ];

  const height = gExchY + gExchH + 60;
  return { nodes, height };
}

const edges: Edge[] = [
  {
    id: 'e-user-web',
    source: 'user',
    target: 'web',
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'animated',
  },
  {
    id: 'e-web-api',
    source: 'web',
    target: 'api',
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'animated',
  },
  {
    id: 'e-api-kafka',
    source: 'api',
    target: 'kafka',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    type: 'animated',
  },
  {
    id: 'e-kafka-worker',
    source: 'kafka',
    target: 'worker',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    type: 'animated',
  },
  {
    id: 'e-worker-upbit',
    source: 'worker',
    target: 'upbit',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    type: 'animated',
  },
  {
    id: 'e-worker-binance',
    source: 'worker',
    target: 'binance',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    type: 'animated',
  },
  {
    id: 'e-api-db',
    source: 'api',
    target: 'db',
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'animated',
  },
  {
    id: 'e-worker-db',
    source: 'worker',
    target: 'db',
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'animated',
  },
];

const nodeTypes = { arch: ArchNode };
const edgeTypes = { animated: AnimatedEdge };

// --- Component ---
export default function ArchitectureFlow() {
  const isMobile = useIsMobile();
  const s = isMobile ? SIZES.mobile : SIZES.desktop;
  const { nodes: layoutNodes, height } = buildLayout(s);

  const minWidth = isMobile ? 700 : undefined;

  return (
    <div style={{ overflowX: isMobile ? 'auto' : undefined, WebkitOverflowScrolling: 'touch' }}>
      <div style={{ height, width: '100%', minWidth }} key={isMobile ? 'mobile' : 'desktop'}>
        <ReactFlow
          nodes={layoutNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          preventScrolling={false}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
}
