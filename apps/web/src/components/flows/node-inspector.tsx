'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useFlowStore } from '@/stores/use-flow-store';
import { NODE_TYPE_REGISTRY } from '@coin/types';
import { Trash2 } from 'lucide-react';

export function NodeInspector() {
  const t = useTranslations('flows');
  const nodes = useFlowStore((s) => s.nodes);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const traceData = useFlowStore((s) => s.traceData);
  const timelineIndex = useFlowStore((s) => s.timelineIndex);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="flex h-full w-64 items-center justify-center border-l border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">{t('selectNode')}</p>
      </div>
    );
  }

  const registry = NODE_TYPE_REGISTRY[node.data.subtype];
  const config = node.data.config || {};
  const backtestStatus = useFlowStore((s) => s.backtestStatus);

  // Find trace entry for this node at current timeline position
  const currentTrace = useMemo(() => {
    if (backtestStatus !== 'completed' || traceData.length === 0) return null;
    const timestamps = [...new Set(traceData.map((t) => t.timestamp))].sort();
    const currentTs = timestamps[timelineIndex];
    if (!currentTs) return null;
    return traceData.find((t) => t.nodeId === node.id && t.timestamp === currentTs) ?? null;
  }, [traceData, timelineIndex, backtestStatus, node.id]);

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
        <div className="flex flex-col gap-2">
          {Object.entries(config).map(([key, val]) => (
            <label key={key} className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">{key}</span>
              {typeof val === 'boolean' ? (
                <button
                  onClick={() => updateNodeConfig(node.id, { [key]: !val })}
                  className={`rounded px-2 py-1 text-xs ${
                    val ? 'bg-emerald-900/30 text-emerald-400' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {val ? 'true' : 'false'}
                </button>
              ) : (
                <input
                  type={typeof val === 'number' ? 'number' : 'text'}
                  value={String(val)}
                  onChange={(e) =>
                    updateNodeConfig(node.id, {
                      [key]: typeof val === 'number' ? Number(e.target.value) || 0 : e.target.value,
                    })
                  }
                  className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                />
              )}
            </label>
          ))}
        </div>

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
