'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Card, CardContent } from '@/components/ui/card';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { MiniChart } from '@/components/mini-chart';
import { useStrategyRuntime, type StrategyRunStatus } from '@/hooks/use-strategy-runtime';
import { Tooltip } from '@/components/ui/tooltip';
import { formatKrw } from '@/lib/utils';

const TYPE_BADGE_VARIANT: Record<string, 'info' | 'purple' | 'orange'> = {
  rsi: 'info',
  macd: 'purple',
  bollinger: 'orange',
};

const STATUS_BADGE: Record<
  StrategyRunStatus,
  { variant: 'muted' | 'info' | 'success' | 'warning' | 'error'; labelKo: string; labelEn: string }
> = {
  idle: { variant: 'muted', labelKo: '대기', labelEn: 'Idle' },
  signal: { variant: 'info', labelKo: '신호감지', labelEn: 'Signal' },
  order_placed: { variant: 'success', labelKo: '주문실행', labelEn: 'Order Placed' },
  risk_blocked: { variant: 'warning', labelKo: '리스크차단', labelEn: 'Risk Blocked' },
  error: { variant: 'error', labelKo: '오류', labelEn: 'Error' },
};

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export interface StrategyCardProps {
  strategy: {
    id: string;
    name: string;
    type: string;
    exchange: string;
    symbol: string;
    mode: string;
    tradingMode: string;
    enabled: boolean;
    intervalSeconds: number;
    candleInterval?: string;
    createdAt: string;
  };
  onToggle: () => void;
  onDelete: () => void;
}

export function StrategyCard({ strategy, onToggle, onDelete }: StrategyCardProps) {
  const t = useTranslations('strategies');
  const runtime = useStrategyRuntime(strategy.id, strategy.enabled);
  const statusInfo = STATUS_BADGE[runtime.status];

  const modeLabel = strategy.mode === 'auto' ? t('auto') : t('signal');
  const modeTooltip = strategy.mode === 'auto' ? t('autoTooltip') : t('signalTooltip');
  const tradingLabel = strategy.tradingMode === 'paper' ? t('paper') : t('real');
  const tradingTooltip = strategy.tradingMode === 'paper' ? t('paperTooltip') : t('realTooltip');

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/strategies/${strategy.id}`} className="font-semibold hover:underline">
                {strategy.name}
              </Link>
              <Badge variant={TYPE_BADGE_VARIANT[strategy.type] ?? 'muted'}>
                {strategy.type.toUpperCase()}
              </Badge>
              {strategy.enabled && <Badge variant={statusInfo.variant}>{statusInfo.labelKo}</Badge>}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ExchangeIcon exchange={strategy.exchange} size={14} />
              {strategy.exchange.toUpperCase()}
              <span className="mx-0.5">:</span>
              <CoinIcon symbol={strategy.symbol} size={14} />
              {strategy.symbol}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
              <Tooltip content={modeTooltip}>
                <span
                  className={
                    strategy.mode === 'auto'
                      ? 'text-green-600 dark:text-green-400 cursor-help'
                      : 'text-blue-600 dark:text-blue-400 cursor-help'
                  }
                >
                  {modeLabel}
                </span>
              </Tooltip>
              <Tooltip content={tradingTooltip}>
                <span
                  className={
                    strategy.tradingMode === 'paper'
                      ? 'text-purple-600 dark:text-purple-400 cursor-help'
                      : 'text-orange-600 dark:text-orange-400 cursor-help'
                  }
                >
                  {tradingLabel}
                </span>
              </Tooltip>
              <span>{strategy.intervalSeconds}s</span>
              <span>{strategy.candleInterval || '1h'}봉</span>
            </div>

            {/* Runtime info row */}
            {strategy.enabled && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                {runtime.lastActivityAt && <span>최근: {timeAgo(runtime.lastActivityAt)}</span>}
                {runtime.realizedPnl !== null && (
                  <span
                    className={
                      runtime.realizedPnl > 0
                        ? 'text-green-600 dark:text-green-400'
                        : runtime.realizedPnl < 0
                          ? 'text-red-600 dark:text-red-400'
                          : ''
                    }
                  >
                    PnL: {runtime.realizedPnl > 0 ? '+' : ''}
                    {formatKrw(runtime.realizedPnl)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 shrink-0">
            <ToggleSwitch checked={strategy.enabled} onChange={onToggle} size="sm" />
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive h-7 text-xs"
              onClick={onDelete}
            >
              {t('delete')}
            </Button>
          </div>
        </div>
        <div className="mt-3">
          <Link href={`/strategies/${strategy.id}`}>
            <MiniChart
              exchange={strategy.exchange}
              symbol={strategy.symbol}
              width={200}
              height={40}
            />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
