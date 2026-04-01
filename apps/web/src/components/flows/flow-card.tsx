'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Trash2, Workflow } from 'lucide-react';
import type { FlowItem } from '@/lib/api-client';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-400',
  running: 'bg-blue-900/30 text-blue-400',
  completed: 'bg-green-900/30 text-green-400',
  failed: 'bg-red-900/30 text-red-400',
};

interface FlowCardProps {
  flow: FlowItem;
  onDelete: () => void;
}

export function FlowCard({ flow, onDelete }: FlowCardProps) {
  const t = useTranslations('flows');
  const latestBacktest = flow.backtests?.[0];
  const nodeCount = flow.definition?.nodes?.length || 0;

  return (
    <Link
      href={`/flows/${flow.id}`}
      className="group block rounded-lg border border-border bg-card p-4 transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Workflow size={18} className="text-purple-400" />
          <div>
            <h3 className="text-sm font-medium">{flow.name}</h3>
            <p className="text-xs text-muted-foreground">
              {flow.exchange} · {flow.symbol} · {flow.candleInterval}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label={t('delete')}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{nodeCount} nodes</span>
        <span>·</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] ${flow.enabled ? 'bg-green-900/30 text-green-400' : 'bg-muted text-muted-foreground'}`}
        >
          {flow.enabled ? 'ON' : 'OFF'}
        </span>
        <span>·</span>
        <span>{flow.tradingMode === 'paper' ? '모의' : '실전'}</span>
      </div>

      {/* Latest backtest */}
      {latestBacktest ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] ${STATUS_STYLES[latestBacktest.status] || 'bg-muted text-muted-foreground'}`}
          >
            {t(latestBacktest.status as 'pending' | 'running' | 'completed' | 'failed')}
          </span>
          {latestBacktest.summary && (
            <span className="text-muted-foreground">
              Win {(latestBacktest.summary.winRate * 100).toFixed(0)}% · PnL{' '}
              <span
                className={
                  latestBacktest.summary.realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
                }
              >
                {latestBacktest.summary.realizedPnl >= 0 ? '+' : ''}
                {latestBacktest.summary.realizedPnl.toFixed(2)}
              </span>
            </span>
          )}
        </div>
      ) : (
        <p className="mt-2 text-[10px] text-muted-foreground">{t('noBacktest')}</p>
      )}
    </Link>
  );
}
