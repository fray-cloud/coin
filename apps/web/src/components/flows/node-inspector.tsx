'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFlowStore } from '@/stores/use-flow-store';
import { NODE_TYPE_REGISTRY } from '@coin/types';
import { Trash2 } from 'lucide-react';

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
  overbought: '과매수 기준',
  oversold: '과매도 기준',
};

const PARAM_VALUE_LABELS: Record<string, string> = {
  buy: '매수',
  sell: '매도',
  above: '상향 돌파 (골든크로스)',
  below: '하향 돌파 (데드크로스)',
  AND: 'AND (모두 참일 때)',
  OR: 'OR (하나라도 참일 때)',
  close: '종가',
  open: '시가',
  high: '고가',
  low: '저가',
};

function ParamInput({
  paramKey,
  value,
  onChange,
  options,
}: {
  paramKey: string;
  value: unknown;
  onChange: (val: unknown) => void;
  options?: string[];
}) {
  if (options && options.length > 0) {
    return (
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {PARAM_VALUE_LABELS[opt] ?? opt}
          </option>
        ))}
      </select>
    );
  }
  if (typeof value === 'boolean') {
    return (
      <button
        onClick={() => onChange(!value)}
        className={`rounded px-2 py-1 text-xs ${
          value ? 'bg-emerald-900/30 text-emerald-400' : 'bg-muted text-muted-foreground'
        }`}
      >
        {value ? 'true' : 'false'}
      </button>
    );
  }
  return (
    <input
      type={typeof value === 'number' ? 'number' : 'text'}
      value={String(value)}
      onChange={(e) =>
        onChange(typeof value === 'number' ? Number(e.target.value) || 0 : e.target.value)
      }
      className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
      placeholder={PARAM_VALUE_LABELS[String(value)] ?? String(value)}
    />
  );
}

export function NodeInspector() {
  const t = useTranslations('flows');
  const nodes = useFlowStore((s) => s.nodes);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const traceData = useFlowStore((s) => s.traceData);
  const timelineIndex = useFlowStore((s) => s.timelineIndex);
  const backtestStatus = useFlowStore((s) => s.backtestStatus);

  const node = nodes.find((n) => n.id === selectedNodeId);

  const currentTrace = useMemo(() => {
    if (!node || backtestStatus !== 'completed' || traceData.length === 0) return null;
    const timestamps = [...new Set(traceData.map((t) => t.timestamp))].sort();
    const currentTs = timestamps[timelineIndex];
    if (!currentTs) return null;
    return traceData.find((t) => t.nodeId === node.id && t.timestamp === currentTs) ?? null;
  }, [node, traceData, timelineIndex, backtestStatus]);

  if (!node) {
    return (
      <div className="flex h-full w-64 items-center justify-center border-l border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{t('selectNode')}</p>
      </div>
    );
  }

  const registry = NODE_TYPE_REGISTRY[node.data.subtype];
  const config = node.data.config || {};
  const params = registry?.params;

  const requiredParams = params?.filter((p) => p.required) ?? [];
  const optionalParams = params?.filter((p) => !p.required) ?? [];

  return (
    <div className="flex h-full w-64 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            {registry?.label || node.data.subtype}
          </h3>
          <p className="text-[10px] text-muted-foreground">{node.id}</p>
        </div>
        <button
          onClick={() => deleteNode(node.id)}
          className="rounded p-1 text-muted-foreground transition hover:bg-red-900/30 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={t('deleteNode')}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Parameters */}
      <div className="flex-1 overflow-y-auto p-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('parameters')}
        </h4>

        {params ? (
          <div className="flex flex-col gap-2">
            {/* Required params — always shown */}
            {requiredParams.map(({ key, options }) => (
              <label key={key} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {PARAM_LABELS[key] ?? key}
                </span>
                <ParamInput
                  paramKey={key}
                  value={config[key] ?? registry.defaultConfig[key]}
                  onChange={(val) => updateNodeConfig(node.id, { [key]: val })}
                  options={options}
                />
              </label>
            ))}

            {/* Optional params — toggle to enable/disable */}
            {optionalParams.length > 0 && (
              <>
                <div className="mt-1 border-t border-border pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    선택적 파라미터
                  </span>
                </div>
                {optionalParams.map(({ key, options }) => {
                  const isEnabled = key in config;
                  const defaultVal = registry.defaultConfig[key];
                  return (
                    <div key={key} className="flex flex-col gap-0.5">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => {
                            if (isEnabled) {
                              updateNodeConfig(node.id, { [key]: undefined });
                            } else {
                              updateNodeConfig(node.id, { [key]: defaultVal });
                            }
                          }}
                          className="h-3 w-3 accent-primary"
                        />
                        <span
                          className={`text-[10px] ${isEnabled ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}
                        >
                          {PARAM_LABELS[key] ?? key}
                        </span>
                      </label>
                      {isEnabled ? (
                        <ParamInput
                          paramKey={key}
                          value={config[key]}
                          onChange={(val) => updateNodeConfig(node.id, { [key]: val })}
                          options={options}
                        />
                      ) : (
                        <span className="rounded border border-border/40 bg-muted/40 px-2 py-1 text-xs text-muted-foreground/40">
                          기본값: {PARAM_VALUE_LABELS[String(defaultVal)] ?? String(defaultVal)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ) : (
          /* Fallback: no params metadata — render all config keys as before */
          <div className="flex flex-col gap-2">
            {Object.entries(config).map(([key, val]) => (
              <label key={key} className="flex flex-col gap-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {PARAM_LABELS[key] ?? key}
                </span>
                <ParamInput
                  paramKey={key}
                  value={val}
                  onChange={(v) => updateNodeConfig(node.id, { [key]: v })}
                />
              </label>
            ))}
          </div>
        )}

        {/* Ports info */}
        {registry && (
          <div className="mt-4">
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('ports')}
            </h4>
            {registry.inputs.length > 0 && (
              <div className="mb-1">
                <span className="text-[10px] text-muted-foreground/60">{t('inputs')}:</span>
                {registry.inputs.map((p) => (
                  <span key={p.name} className="ml-1 text-[10px] text-muted-foreground">
                    {p.name}({p.type})
                  </span>
                ))}
              </div>
            )}
            {registry.outputs.length > 0 && (
              <div>
                <span className="text-[10px] text-muted-foreground/60">{t('outputs')}:</span>
                {registry.outputs.map((p) => (
                  <span key={p.name} className="ml-1 text-[10px] text-muted-foreground">
                    {p.name}({p.type})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Execution trace */}
        {currentTrace && (
          <div className="mt-4">
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t('executionTrace')}
            </h4>
            <div
              className={`rounded p-2 text-[10px] ${
                currentTrace.fired
                  ? 'bg-emerald-900/20 text-emerald-300'
                  : 'bg-red-900/20 text-red-300'
              }`}
            >
              <div>fired: {String(currentTrace.fired)}</div>
              <div>duration: {currentTrace.durationMs}ms</div>
              <div className="mt-1 text-muted-foreground">
                output: {JSON.stringify(currentTrace.output, null, 1)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
