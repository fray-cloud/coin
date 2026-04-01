'use client';

import { useCallback } from 'react';
import { NODE_TYPE_REGISTRY } from '@coin/types';
import type { NodeTypeInfo } from '@coin/types';
import { useFlowStore } from '@/stores/use-flow-store';

const CATEGORIES: { type: string; label: string; color: string }[] = [
  { type: 'data', label: '데이터', color: 'text-blue-400' },
  { type: 'indicator', label: '지표', color: 'text-purple-400' },
  { type: 'condition', label: '조건', color: 'text-amber-400' },
  { type: 'order', label: '주문', color: 'text-emerald-400' },
];

const grouped = CATEGORIES.map((cat) => ({
  ...cat,
  items: Object.values(NODE_TYPE_REGISTRY).filter((n) => n.type === cat.type),
}));

let nodeIdCounter = 0;

export function NodePalette() {
  const addNode = useFlowStore((s) => s.addNode);

  const handleAdd = useCallback(
    (info: NodeTypeInfo) => {
      const id = `${info.subtype}-${++nodeIdCounter}`;
      addNode({
        id,
        type: info.type,
        position: { x: 250 + Math.random() * 100, y: 150 + Math.random() * 100 },
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

  const onDragStart = useCallback((e: React.DragEvent, info: NodeTypeInfo) => {
    e.dataTransfer.setData('application/reactflow-subtype', info.subtype);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  return (
    <div className="flex h-full w-48 flex-col gap-3 overflow-y-auto border-r border-border bg-card p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">노드</h3>
      {grouped.map((cat) => (
        <div key={cat.type}>
          <h4 className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${cat.color}`}>
            {cat.label}
          </h4>
          <div className="flex flex-col gap-1">
            {cat.items.map((info) => (
              <button
                key={info.subtype}
                draggable
                onDragStart={(e) => onDragStart(e, info)}
                onClick={() => handleAdd(info)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      cat.type === 'data'
                        ? '#3b82f6'
                        : cat.type === 'indicator'
                          ? '#8b5cf6'
                          : cat.type === 'condition'
                            ? '#f59e0b'
                            : '#10b981',
                  }}
                />
                {info.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
