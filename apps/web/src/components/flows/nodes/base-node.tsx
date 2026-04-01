'use client';

import { memo, useMemo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { NODE_TYPE_REGISTRY } from '@coin/types';
import type { PortDefinition } from '@coin/types';
import { useFlowStore, type FlowNodeData } from '@/stores/use-flow-store';

// Color per port data type — used on handles and type badges
export const PORT_TYPE_COLORS: Record<string, string> = {
  'Candle[]': '#f59e0b',
  'OrderBookLevel[]': '#8b5cf6',
  number: '#06b6d4',
  boolean: '#22c55e',
  'boolean[]': '#10b981',
  OrderResult: '#f97316',
};

// Korean display labels for port types
const PORT_TYPE_LABELS: Record<string, string> = {
  'Candle[]': '캔들',
  'OrderBookLevel[]': '호가창',
  number: '숫자',
  boolean: '불리언',
  'boolean[]': '불리언[]',
  OrderResult: '주문결과',
};

const NODE_STYLES: Record<string, { border: string; headerBg: string; dot: string }> = {
  data: { border: 'border-blue-500', headerBg: 'bg-blue-900/60', dot: 'bg-blue-400' },
  indicator: { border: 'border-purple-500', headerBg: 'bg-purple-900/60', dot: 'bg-purple-400' },
  condition: { border: 'border-amber-500', headerBg: 'bg-amber-900/60', dot: 'bg-amber-400' },
  order: { border: 'border-emerald-500', headerBg: 'bg-emerald-900/60', dot: 'bg-emerald-400' },
  'flow-control': { border: 'border-slate-500', headerBg: 'bg-slate-900/60', dot: 'bg-slate-400' },
};

// A single input port row — handle on the left edge, label inside
function InputPort({ port }: { port: PortDefinition }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = PORT_TYPE_COLORS[port.type] || '#64748b';
  const typeLabel = PORT_TYPE_LABELS[port.type] || port.type;

  return (
    <div
      className="relative flex items-center gap-1 py-0.5 pl-3"
      style={{ position: 'relative' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={port.name}
        style={{
          position: 'absolute',
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 10,
          height: 10,
          background: port.required ? color : 'var(--color-card)',
          border: `2px solid ${color}`,
          borderRadius: '50%',
          zIndex: 1,
        }}
        className="flow-handle"
      />
      <span className="truncate max-w-[72px] text-[10px] text-muted-foreground">{port.name}</span>
      {port.required && <span className="text-[9px] font-bold leading-none text-amber-400">*</span>}

      {showTooltip && (
        <div
          className="pointer-events-none absolute left-full z-50 ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-2 py-1 shadow-lg"
          style={{
            backgroundColor: '#1e293b',
            border: `1px solid ${color}`,
          }}
        >
          <div className="text-[11px] font-semibold text-slate-100">{port.name}</div>
          <div className="text-[10px]" style={{ color }}>
            {typeLabel}
          </div>
          <div className="text-[9px] text-slate-400">
            {port.required ? '필수 입력' : '선택 입력'}
          </div>
        </div>
      )}
    </div>
  );
}

// A single output port row — handle on the right edge, label inside
function OutputPort({ port }: { port: PortDefinition }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = PORT_TYPE_COLORS[port.type] || '#64748b';
  const typeLabel = PORT_TYPE_LABELS[port.type] || port.type;

  return (
    <div
      className="relative flex items-center justify-end gap-1 py-0.5 pr-3"
      style={{ position: 'relative' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle
        type="source"
        position={Position.Right}
        id={port.name}
        style={{
          position: 'absolute',
          right: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 10,
          height: 10,
          background: color,
          border: '2px solid var(--color-card)',
          borderRadius: '50%',
          zIndex: 1,
        }}
        className="flow-handle"
      />
      <span className="truncate max-w-[72px] text-[10px] text-muted-foreground">{port.name}</span>

      {showTooltip && (
        <div
          className="pointer-events-none absolute right-full z-50 mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-2 py-1 shadow-lg"
          style={{
            backgroundColor: '#1e293b',
            border: `1px solid ${color}`,
          }}
        >
          <div className="text-[11px] font-semibold text-slate-100">{port.name}</div>
          <div className="text-[10px]" style={{ color }}>
            {typeLabel}
          </div>
        </div>
      )}
    </div>
  );
}

function BaseNode({ id, data, selected }: NodeProps & { data: FlowNodeData }) {
  const style = NODE_STYLES[data.nodeType] || NODE_STYLES.data;
  const registry = NODE_TYPE_REGISTRY[data.subtype];
  const inputs = registry?.inputs || [];
  const outputs = registry?.outputs || [];

  const traceData = useFlowStore((s) => s.traceData);
  const timelineIndex = useFlowStore((s) => s.timelineIndex);
  const backtestStatus = useFlowStore((s) => s.backtestStatus);

  const traceState = useMemo(() => {
    if (backtestStatus !== 'completed' || traceData.length === 0) return null;
    const timestamps = [...new Set(traceData.map((t) => t.timestamp))].sort();
    const currentTs = timestamps[timelineIndex];
    if (!currentTs) return null;
    return traceData.find((t) => t.nodeId === id && t.timestamp === currentTs) ?? null;
  }, [traceData, timelineIndex, backtestStatus, id]);

  let glowStyle = '';
  let traceValue: string | null = null;
  if (traceState) {
    glowStyle = traceState.fired
      ? 'shadow-[0_0_20px_rgba(16,185,129,0.4)]'
      : 'shadow-[0_0_20px_rgba(239,68,68,0.4)]';
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

  const hasConfig = Object.keys(data.config || {}).length > 0;
  const hasPorts = inputs.length > 0 || outputs.length > 0;

  return (
    <div
      className={`min-w-[180px] rounded-lg border ${style.border} bg-card shadow-md transition-shadow duration-300 ${glowStyle} ${
        selected ? 'ring-2 ring-white/30' : ''
      }`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 ${style.headerBg}`}>
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className="text-xs font-medium text-foreground">
          {registry?.label || data.subtype}
        </span>
        {traceState && (
          <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground">
            {traceState.fired ? (
              <CheckCircle2 size={10} className="text-emerald-400" aria-label="Fired" />
            ) : (
              <XCircle size={10} className="text-red-400" aria-label="Blocked" />
            )}
            {traceState.durationMs}ms
          </span>
        )}
      </div>

      {/* Config preview or trace value */}
      {traceValue != null ? (
        <div className="px-3 py-1.5 text-center text-sm font-mono font-medium text-foreground">
          {traceValue}
        </div>
      ) : (
        hasConfig && (
          <div className="px-3 py-1.5">
            {Object.entries(data.config || {})
              .slice(0, 3)
              .map(([key, val]) => (
                <div key={key} className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground/60">{key}</span>
                  <span className="text-muted-foreground">{String(val)}</span>
                </div>
              ))}
          </div>
        )
      )}

      {/* Ports section */}
      {hasPorts && (
        <div className="border-t border-border/40">
          <div className="flex">
            {/* Input ports */}
            <div className="flex-1 py-1.5">
              {inputs.length > 0 && (
                <>
                  <div className="px-3 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 mb-0.5">
                    입력
                  </div>
                  {inputs.map((input) => (
                    <InputPort key={input.name} port={input} />
                  ))}
                </>
              )}
            </div>

            {/* Output ports */}
            <div className="flex-1 py-1.5 border-l border-border/30">
              {outputs.length > 0 && (
                <>
                  <div className="px-3 text-right text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 mb-0.5">
                    출력
                  </div>
                  {outputs.map((output) => (
                    <OutputPort key={output.name} port={output} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}
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
