'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Button } from '@/components/ui/button';
import type { StrategyItem } from '@/lib/api-client';

interface StrategyInfoProps {
  strategy: StrategyItem;
  onToggle: () => void;
  onDelete: () => void;
}

export function StrategyInfo({ strategy, onToggle, onDelete }: StrategyInfoProps) {
  const config = strategy.config as Record<string, unknown>;
  const riskConfig = strategy.riskConfig as Record<string, unknown>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{strategy.name}</CardTitle>
          <div className="flex items-center gap-3">
            <ToggleSwitch
              checked={strategy.enabled}
              onChange={onToggle}
              label={strategy.enabled ? 'Enabled' : 'Disabled'}
            />
            <Button variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Type</span>
            <p className="font-medium">{strategy.type.toUpperCase()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Exchange</span>
            <p className="font-medium capitalize">{strategy.exchange}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Symbol</span>
            <p className="font-medium">{strategy.symbol}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Interval</span>
            <p className="font-medium">{strategy.intervalSeconds}s</p>
          </div>
          <div>
            <span className="text-muted-foreground">Mode</span>
            <p
              className={`font-medium ${strategy.mode === 'auto' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}
            >
              {strategy.mode}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Trading</span>
            <p
              className={`font-medium ${strategy.tradingMode === 'paper' ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}
            >
              {strategy.tradingMode}
            </p>
          </div>
        </div>

        {/* Config details */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Parameters</p>
            <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
              {Object.entries(config).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
          {Object.keys(riskConfig).length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Risk Management</p>
              <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                {Object.entries(riskConfig).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
