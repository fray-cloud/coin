'use client';

import { useState } from 'react';
import { X, Workflow, ChevronRight } from 'lucide-react';
import { FLOW_TEMPLATES, type FlowTemplate } from '@/lib/flow-templates';

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-emerald-400 bg-emerald-400/10',
  intermediate: 'text-amber-400 bg-amber-400/10',
  advanced: 'text-red-400 bg-red-400/10',
};

interface TemplatePickerModalProps {
  onSelect: (template: FlowTemplate | null) => void;
  onClose: () => void;
}

export function TemplatePickerModal({ onSelect, onClose }: TemplatePickerModalProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">플로우 시작하기</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              템플릿을 선택하거나 빈 플로우로 시작하세요.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
          {/* Empty flow card */}
          <button
            onClick={() => onSelect(null)}
            onMouseEnter={() => setHovered('empty')}
            onMouseLeave={() => setHovered(null)}
            className={`group flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition ${
              hovered === 'empty'
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:border-primary/60'
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <Workflow size={18} className="text-muted-foreground" />
              </div>
              <ChevronRight
                size={16}
                className={`transition ${hovered === 'empty' ? 'text-primary' : 'text-muted-foreground/40'}`}
              />
            </div>
            <div>
              <p className="font-medium text-sm">빈 플로우</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                처음부터 노드를 직접 구성합니다.
              </p>
            </div>
          </button>

          {/* Template cards */}
          {FLOW_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              onMouseEnter={() => setHovered(template.id)}
              onMouseLeave={() => setHovered(null)}
              className={`group flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition ${
                hovered === template.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-primary/60'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      DIFFICULTY_COLORS[template.difficulty]
                    }`}
                  >
                    {DIFFICULTY_LABELS[template.difficulty]}
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className={`transition ${hovered === template.id ? 'text-primary' : 'text-muted-foreground/40'}`}
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{template.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {template.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
