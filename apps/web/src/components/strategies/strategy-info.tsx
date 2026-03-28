'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateStrategy, type StrategyItem } from '@/lib/api-client';
import { PARAM_TOOLTIPS } from '@/lib/constants';

interface StrategyInfoProps {
  strategy: StrategyItem;
  onToggle: () => void;
  onDelete: () => void;
}

const CANDLE_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

export function StrategyInfo({ strategy, onToggle, onDelete }: StrategyInfoProps) {
  const t = useTranslations('strategies');
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  // Editable fields
  const [name, setName] = useState(strategy.name);
  const [mode, setMode] = useState(strategy.mode);
  const [tradingMode, setTradingMode] = useState(strategy.tradingMode);
  const [intervalSeconds, setIntervalSeconds] = useState(String(strategy.intervalSeconds));
  const [candleInterval, setCandleInterval] = useState(strategy.candleInterval || '1h');
  const [config, setConfig] = useState<Record<string, unknown>>(
    strategy.config as Record<string, unknown>,
  );
  const [riskConfig, setRiskConfig] = useState<Record<string, unknown>>(
    strategy.riskConfig as Record<string, unknown>,
  );

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof updateStrategy>[1]) => updateStrategy(strategy.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategy', strategy.id] });
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      setEditing(false);
    },
  });

  const handleCancel = () => {
    setName(strategy.name);
    setMode(strategy.mode);
    setTradingMode(strategy.tradingMode);
    setIntervalSeconds(String(strategy.intervalSeconds));
    setCandleInterval(strategy.candleInterval || '1h');
    setConfig(strategy.config as Record<string, unknown>);
    setRiskConfig(strategy.riskConfig as Record<string, unknown>);
    setEditing(false);
  };

  const handleSave = () => {
    mutation.mutate({
      name,
      mode,
      tradingMode,
      intervalSeconds: Number(intervalSeconds),
      candleInterval,
      config,
      riskConfig: Object.keys(riskConfig).length > 0 ? riskConfig : undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">
            {editing ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-semibold h-auto py-1"
              />
            ) : (
              strategy.name
            )}
          </CardTitle>
          <div className="flex items-center gap-3">
            {!editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="gap-1"
              >
                <Pencil size={14} />
                {t('edit')}
              </Button>
            )}
            <ToggleSwitch
              checked={strategy.enabled}
              onChange={onToggle}
              label={strategy.enabled ? 'Enabled' : 'Disabled'}
            />
            <Button variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
              {t('delete')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {/* Read-only fields */}
          <div>
            <span className="text-muted-foreground">{t('type')}</span>
            <p className="font-medium">{strategy.type.toUpperCase()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('exchange')}</span>
            <p className="font-medium capitalize">{strategy.exchange}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('symbol')}</span>
            <p className="font-medium">{strategy.symbol}</p>
          </div>

          {/* Editable: interval */}
          <div>
            <span className="text-muted-foreground">{t('interval')}</span>
            {editing ? (
              <Input
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(e.target.value)}
                type="number"
                min="10"
                className="h-8 mt-1"
              />
            ) : (
              <p className="font-medium">{strategy.intervalSeconds}s</p>
            )}
          </div>

          {/* Editable: candle interval */}
          <div>
            <span className="text-muted-foreground">{t('candleInterval')}</span>
            {editing ? (
              <div className="flex gap-1 mt-1">
                {CANDLE_INTERVALS.map((iv) => (
                  <Button
                    key={iv}
                    type="button"
                    variant={candleInterval === iv ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCandleInterval(iv)}
                  >
                    {iv}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="font-medium">{strategy.candleInterval || '1h'}</p>
            )}
          </div>

          {/* Editable: mode */}
          <div>
            <span className="text-muted-foreground">{t('mode')}</span>
            {editing ? (
              <div className="flex gap-1 mt-1">
                <Button
                  type="button"
                  variant={mode === 'signal' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setMode('signal')}
                >
                  {t('signal')}
                </Button>
                <Button
                  type="button"
                  variant={mode === 'auto' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setMode('auto')}
                >
                  {t('auto')}
                </Button>
              </div>
            ) : (
              <p
                className={`font-medium ${strategy.mode === 'auto' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}
              >
                {strategy.mode}
              </p>
            )}
          </div>

          {/* Editable: trading mode */}
          <div>
            <span className="text-muted-foreground">{t('trading')}</span>
            {editing ? (
              <div className="flex gap-1 mt-1">
                <Button
                  type="button"
                  variant={tradingMode === 'paper' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTradingMode('paper')}
                >
                  {t('paper')}
                </Button>
                <Button
                  type="button"
                  variant={tradingMode === 'real' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setTradingMode('real')}
                >
                  {t('real')}
                </Button>
              </div>
            ) : (
              <p
                className={`font-medium ${strategy.tradingMode === 'paper' ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}
              >
                {strategy.tradingMode}
              </p>
            )}
          </div>
        </div>

        {/* Config details */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('params')}</p>
            {editing ? (
              <div className="space-y-2">
                {Object.entries(config).map(([k, v]) => (
                  <div key={k}>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      {k}
                      {PARAM_TOOLTIPS[k] && (
                        <span className="relative group cursor-help">
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            ?
                          </span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md w-48 hidden group-hover:block z-10">
                            {PARAM_TOOLTIPS[k]}
                          </span>
                        </span>
                      )}
                    </Label>
                    <Input
                      value={String(v)}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          [k]: isNaN(Number(e.target.value))
                            ? e.target.value
                            : Number(e.target.value),
                        }))
                      }
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                {Object.entries(config).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('risk')}</p>
            {editing ? (
              <div className="space-y-2">
                {['stopLossPercent', 'dailyMaxLossUsd', 'maxPositionSize'].map((k) => (
                  <div key={k}>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      {k}
                      {PARAM_TOOLTIPS[k] && (
                        <span className="relative group cursor-help">
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            ?
                          </span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md w-48 hidden group-hover:block z-10">
                            {PARAM_TOOLTIPS[k]}
                          </span>
                        </span>
                      )}
                    </Label>
                    <Input
                      value={String(riskConfig[k] ?? '')}
                      onChange={(e) =>
                        setRiskConfig((prev) => ({
                          ...prev,
                          [k]:
                            e.target.value === ''
                              ? undefined
                              : isNaN(Number(e.target.value))
                                ? e.target.value
                                : Number(e.target.value),
                        }))
                      }
                      className="h-8"
                      placeholder="-"
                    />
                  </div>
                ))}
              </div>
            ) : Object.keys(strategy.riskConfig as object).length > 0 ? (
              <div className="bg-muted/50 rounded p-2 text-xs space-y-1">
                {Object.entries(strategy.riskConfig as Record<string, unknown>).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">-</p>
            )}
          </div>
        </div>

        {/* Edit mode buttons */}
        {editing && (
          <div className="mt-4 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              {t('cancel')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
              {mutation.isPending ? '...' : t('save')}
            </Button>
          </div>
        )}

        {mutation.isError && (
          <p className="mt-2 text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to update'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
