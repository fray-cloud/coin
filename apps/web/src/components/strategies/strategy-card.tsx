'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Card, CardContent } from '@/components/ui/card';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { MiniChart } from '@/components/mini-chart';

const TYPE_BADGE_VARIANT: Record<string, 'info' | 'purple' | 'orange'> = {
  rsi: 'info',
  macd: 'purple',
  bollinger: 'orange',
};

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
    createdAt: string;
  };
  onToggle: () => void;
  onDelete: () => void;
}

export function StrategyCard({ strategy, onToggle, onDelete }: StrategyCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href={`/strategies/${strategy.id}`} className="font-semibold hover:underline">
                {strategy.name}
              </Link>
              <Badge variant={TYPE_BADGE_VARIANT[strategy.type] ?? 'muted'}>
                {strategy.type.toUpperCase()}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ExchangeIcon exchange={strategy.exchange} size={14} />
              {strategy.exchange.toUpperCase()}
              <span className="mx-0.5">:</span>
              <CoinIcon symbol={strategy.symbol} size={14} />
              {strategy.symbol}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span
                className={
                  strategy.mode === 'auto'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-blue-600 dark:text-blue-400'
                }
              >
                {strategy.mode}
              </span>
              <span
                className={
                  strategy.tradingMode === 'paper'
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-orange-600 dark:text-orange-400'
                }
              >
                {strategy.tradingMode}
              </span>
              <span>{strategy.intervalSeconds}s interval</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ToggleSwitch checked={strategy.enabled} onChange={onToggle} size="sm" />
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive h-7 text-xs"
              onClick={onDelete}
            >
              Delete
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
