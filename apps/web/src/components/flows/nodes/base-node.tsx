'use client';

import { memo, useMemo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { NODE_TYPE_REGISTRY } from '@coin/types';
import type { PortDefinition } from '@coin/types';
import { useFlowStore, type FlowNodeData } from '@/stores/use-flow-store';
import { NODE_HELP } from '../node-help-data';

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

// Korean display labels for port names
const PORT_NAME_LABELS: Record<string, string> = {
  candles: '캔들',
  value: '값',
  macd: 'MACD 값',
  signal: '시그널 값',
  histogram: '히스토그램',
  upper: '상단 밴드',
  middle: '중간 밴드',
  lower: '하단 밴드',
  result: '조건 결과',
  trigger: '트리거',
  a: '조건 A',
  b: '조건 B',
  value_a: '비교값 A',
  value_b: '기준값 B',
};

// Korean display labels for config parameter keys
const PARAM_LABELS: Record<string, string> = {
  period: '기간',
  source: '기준가',
  fastPeriod: '단기 기간',
  slowPeriod: '장기 기간',
  signalPeriod: '시그널 기간',
  stdDev: '표준편차 배수',
  operator: '연산자',
  threshold: '기준값',
  direction: '방향',
  side: '매매 방향',
  amount: '수량',
  message: '알림 메시지',
};

// Korean display labels for config parameter values
const PARAM_VALUE_LABELS: Record<string, string> = {
  buy: '매수',
  sell: '매도',
  above: '상향 돌파',
  below: '하향 돌파',
  AND: 'AND',
  OR: 'OR',
  close: '종가',
  open: '시가',
  high: '고가',
  low: '저가',
};

const NODE_STYLES: Record<string, { border: string; headerBg: string; dot: string }> = {
  data: { border: 'border-blue-500', headerBg: 'bg-blue-900/60', dot: 'bg-blue-400' },
  indicator: { border: 'border-purple-500', headerBg: 'bg-purple-900/60', dot: 'bg-purple-400' },
  condition: { border: 'border-amber-500', headerBg: 'bg-amber-900/60', dot: 'bg-amber-400' },
  order: { border: 'border-emerald-500', headerBg: 'bg-emerald-900/60', dot: 'bg-emerald-400' },
  'flow-control': { border: 'border-slate-500', headerBg: 'bg-slate-900/60', dot: 'bg-slate-400' },
};

// Inline help popover shown when ? button is clicked
function NodeHelpPopover({ subtype, onClose }: { subtype: string; onClose: () => void }) {
  const help = NODE_HELP[subtype];
  if (!help) return null;

  return (
    <div
      className="absolute left-full z-50 ml-2 top-0 w-64 rounded-lg shadow-xl border border-slate-600 bg-slate-800 p-3"
      // Stop clicks inside the popover from propagating (e.g. deselecting the node)
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-slate-100 leading-snug">
          {help.description}
        </span>
        <button
          onClick={onClose}
          className="shrink-0 text-slate-400 hover:text-slate-200 text-[14px] leading-none"
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {help.paramHints && Object.keys(help.paramHints).length > 0 && (
        <div className="mb-2">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            파라미터
          </div>
          {Object.entries(help.paramHints).map(([key, hint]) => (
            <div key={key} className="mb-0.5">
              <span className="text-[10px] font-medium text-cyan-400">
                {PARAM_LABELS[key] ?? key}:{' '}
              </span>
              <span className="text-[10px] text-slate-400">{hint}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-700 pt-2">
        <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
          사용 예시
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed">{help.usageExample}</p>
      </div>
    </div>
  );
}

// A single input port row — handle on the left edge, label inside
function InputPort({ port, isConnected }: { port: PortDefinition; isConnected: boolean }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = PORT_TYPE_COLORS[port.type] || '#64748b';
  const typeLabel = PORT_TYPE_LABELS[port.type] || port.type;
  const showWarning = port.required && !isConnected;

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
          border: `2px solid ${showWarning ? '#f87171' : color}`,
          borderRadius: '50%',
          zIndex: 1,
        }}
        className="flow-handle"
      />
      <span
        className={`truncate max-w-[72px] text-[10px] ${showWarning ? 'text-red-400' : 'text-muted-foreground'}`}
      >
        {PORT_NAME_LABELS[port.name] ?? port.name}
      </span>
      {port.required && <span className="text-[9px] font-bold leading-none text-amber-400">*</span>}

      {showTooltip && (
        <div
          className="pointer-events-none absolute left-full z-50 ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-2 py-1 shadow-lg"
          style={{
            backgroundColor: '#1e293b',
            border: `1px solid ${showWarning ? '#f87171' : color}`,
          }}
        >
          <div className="text-[11px] font-semibold text-slate-100">
            {PORT_NAME_LABELS[port.name] ?? port.name}
          </div>
          <div className="text-[10px]" style={{ color }}>
            {typeLabel}
          </div>
          <div className={`text-[9px] ${showWarning ? 'text-red-400' : 'text-slate-400'}`}>
            {showWarning ? '입력이 연결되지 않았습니다' : port.required ? '필수 입력' : '선택 입력'}
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
      <span className="truncate max-w-[72px] text-[10px] text-muted-foreground">
        {PORT_NAME_LABELS[port.name] ?? port.name}
      </span>

      {showTooltip && (
        <div
          className="pointer-events-none absolute right-full z-50 mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-2 py-1 shadow-lg"
          style={{
            backgroundColor: '#1e293b',
            border: `1px solid ${color}`,
          }}
        >
          <div className="text-[11px] font-semibold text-slate-100">
            {PORT_NAME_LABELS[port.name] ?? port.name}
          </div>
          <div className="text-[10px]" style={{ color }}>
            {typeLabel}
          </div>
        </div>
      )}
    </div>
  );
}

function BaseNode({ id, data, selected }: NodeProps & { data: FlowNodeData }) {
  const [showHelp, setShowHelp] = useState(false);
  const style = NODE_STYLES[data.nodeType] || NODE_STYLES.data;
  const registry = NODE_TYPE_REGISTRY[data.subtype];
  const inputs = registry?.inputs || [];
  const outputs = registry?.outputs || [];

  const traceData = useFlowStore((s) => s.traceData);
  const timelineIndex = useFlowStore((s) => s.timelineIndex);
  const backtestStatus = useFlowStore((s) => s.backtestStatus);
  const edges = useFlowStore((s) => s.edges);

  // Build a set of connected target handles for this node
  const connectedInputs = useMemo(() => {
    const connected = new Set<string>();
    for (const edge of edges) {
      if (edge.target === id) {
        connected.add(edge.targetHandle ?? '');
      }
    }
    return connected;
  }, [edges, id]);

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
  const hasHelp = !!NODE_HELP[data.subtype];

  // Show a warning badge if any required input is unconnected
  const missingRequiredInputs = inputs.filter((p) => p.required && !connectedInputs.has(p.name));

  return (
    <div
      className={`relative min-w-[180px] rounded-lg border ${style.border} bg-card shadow-md transition-shadow duration-300 ${glowStyle} ${
        selected ? 'ring-2 ring-white/30' : ''
      }`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 rounded-t-lg px-3 py-1.5 ${style.headerBg}`}>
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className="text-xs font-medium text-foreground">
          {registry?.label || data.subtype}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* Unconnected required inputs warning */}
          {missingRequiredInputs.length > 0 && (
            <span
              className="text-[9px] text-red-400 font-semibold"
              title={`필수 입력 미연결: ${missingRequiredInputs.map((p) => PORT_NAME_LABELS[p.name] ?? p.name).join(', ')}`}
            >
              ⚠
            </span>
          )}

          {/* Trace result indicator */}
          {traceState && (
            <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
              {traceState.fired ? (
                <CheckCircle2 size={10} className="text-emerald-400" aria-label="Fired" />
              ) : (
                <XCircle size={10} className="text-red-400" aria-label="Blocked" />
              )}
              {traceState.durationMs}ms
            </span>
          )}

          {/* Help button */}
          {hasHelp && (
            <button
              className="flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors nodrag"
              onClick={(e) => {
                e.stopPropagation();
                setShowHelp((v) => !v);
              }}
              aria-label="도움말"
            >
              <HelpCircle size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Help popover */}
      {showHelp && <NodeHelpPopover subtype={data.subtype} onClose={() => setShowHelp(false)} />}

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
                  <span className="text-muted-foreground/60">{PARAM_LABELS[key] ?? key}</span>
                  <span className="text-muted-foreground">
                    {PARAM_VALUE_LABELS[String(val)] ?? String(val)}
                  </span>
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
                    <InputPort
                      key={input.name}
                      port={input}
                      isConnected={connectedInputs.has(input.name)}
                    />
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
