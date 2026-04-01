'use client';

import { memo, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { NODE_TYPE_REGISTRY } from '@coin/types';
import { useFlowStore, type FlowNodeData } from '@/stores/use-flow-store';

const NODE_STYLES: Record<string, { border: string; headerBg: string; dot: string }> = {
  data: { border: 'border-blue-500', headerBg: 'bg-blue-900/60', dot: 'bg-blue-400' },
  indicator: { border: 'border-purple-500', headerBg: 'bg-purple-900/60', dot: 'bg-purple-400' },
  condition: { border: 'border-amber-500', headerBg: 'bg-amber-900/60', dot: 'bg-amber-400' },
  order: { border: 'border-emerald-500', headerBg: 'bg-emerald-900/60', dot: 'bg-emerald-400' },
  'flow-control': { border: 'border-slate-500', headerBg: 'bg-slate-900/60', dot: 'bg-slate-400' },
};

const HANDLE_COLORS: Record<string, string> = {
  data: '#3b82f6',
  indicator: '#8b5cf6',
  condition: '#f59e0b',
  order: '#10b981',
  'flow-control': '#64748b',
};

function BaseNode({ id, data, selected }: NodeProps & { data: FlowNodeData }) {
  const style = NODE_STYLES[data.nodeType] || NODE_STYLES.data;
  const registry = NODE_TYPE_REGISTRY[data.subtype];
  const inputs = registry?.inputs || [];
  const outputs = registry?.outputs || [];
  const handleColor = HANDLE_COLORS[data.nodeType] || '#64748b';

  // Read trace state for glow effects
  const traceData = useFlowStore((s) => s.traceData);
  const timelineIndex = useFlowStore((s) => s.timelineIndex);
  const backtestStatus = useFlowStore((s) => s.backtestStatus);

  const traceState = useMemo(() => {
    if (backtestStatus !== 'completed' || traceData.length === 0) return null;
    // Get unique timestamps
    const timestamps = [...new Set(traceData.map((t) => t.timestamp))].sort();
    const currentTs = timestamps[timelineIndex];
    if (!currentTs) return null;
    // Find trace for this node at current timestamp
    return traceData.find((t) => t.nodeId === id && t.timestamp === currentTs) ?? null;
  }, [traceData, timelineIndex, backtestStatus, id]);

  // Glow effects based on trace state
  let glowStyle = '';
  let traceValue: string | null = null;
  if (traceState) {
    if (traceState.fired) {
      glowStyle = 'shadow-[0_0_20px_rgba(16,185,129,0.4)]'; // green glow
    } else {
      glowStyle = 'shadow-[0_0_20px_rgba(239,68,68,0.4)]'; // red glow
    }
    // Show output value on the node
    const outEntries = Object.entries(traceState.output);
    if (outEntries.length > 0) {
      const [, val] = outEntries[0];
      traceValue =
        typeof val === 'number'
          ? val.toFixed(2)
          : typeof val === 'boolean'
            ? String(val)
            : val != null
              ? String(val).slice(0, 12)
              : null;
    }
  }

  return (
    <div
      className={`min-w-[160px] rounded-lg border ${style.border} bg-[#1a1a24] shadow-md transition-shadow duration-300 ${glowStyle} ${
        selected ? 'ring-2 ring-white/30' : ''
      }`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 ${style.headerBg}`}>
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className="text-xs font-medium text-white">{registry?.label || data.subtype}</span>
        {traceState && (
          <span className="ml-auto text-[9px] text-zinc-400">{traceState.durationMs}ms</span>
        )}
      </div>

      {/* Config preview or trace value */}
      <div className="px-3 py-2">
        {traceValue != null ? (
          <div className="text-center text-sm font-mono font-medium text-zinc-100">
            {traceValue}
          </div>
        ) : (
          Object.entries(data.config || {})
            .slice(0, 3)
            .map(([key, val]) => (
              <div key={key} className="flex justify-between text-[10px]">
                <span className="text-zinc-500">{key}</span>
                <span className="text-zinc-300">{String(val)}</span>
              </div>
            ))
        )}
      </div>

      {/* Input handles */}
      {inputs.map((input, i) => (
        <Handle
          key={`in-${input.name}`}
          type="target"
          position={Position.Left}
          id={input.name}
          style={{
            top: `${((i + 1) / (inputs.length + 1)) * 100}%`,
            background: handleColor,
            width: 10,
            height: 10,
            border: '2px solid #1a1a24',
          }}
        />
      ))}

      {/* Output handles */}
      {outputs.map((output, i) => (
        <Handle
          key={`out-${output.name}`}
          type="source"
          position={Position.Right}
          id={output.name}
          style={{
            top: `${((i + 1) / (outputs.length + 1)) * 100}%`,
            background: handleColor,
            width: 10,
            height: 10,
            border: '2px solid #1a1a24',
          }}
        />
      ))}
    </div>
  );
}

export const DataNode = memo(BaseNode);
export const IndicatorNode = memo(BaseNode);
export const ConditionNode = memo(BaseNode);
export const OrderNode = memo(BaseNode);
export const FlowControlNode = memo(BaseNode);

export const customNodeTypes = {
  data: DataNode,
  indicator: IndicatorNode,
  condition: ConditionNode,
  order: OrderNode,
  'flow-control': FlowControlNode,
};
