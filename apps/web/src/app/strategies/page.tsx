'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  getStrategies,
  createStrategy,
  toggleStrategy,
  deleteStrategy,
  getExchangeKeys,
  type ExchangeKeyItem,
} from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useTickers } from '@/hooks/use-tickers';
import { ExchangeIcon, CoinIcon } from '@/components/icons';

const STRATEGY_TYPES = [
  { value: 'rsi', label: 'RSI' },
  { value: 'macd', label: 'MACD' },
  { value: 'bollinger', label: 'Bollinger Bands' },
];

const TYPE_COLORS: Record<string, string> = {
  rsi: 'bg-blue-100 text-blue-800',
  macd: 'bg-purple-100 text-purple-800',
  bollinger: 'bg-orange-100 text-orange-800',
};

const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  rsi: { period: 14, overbought: 70, oversold: 30, quantity: '0.001' },
  macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, quantity: '0.001' },
  bollinger: { period: 20, stdDev: 2, quantity: '0.001' },
};

function StrategyCard({
  strategy,
  onToggle,
  onDelete,
}: {
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
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href={`/strategies/${strategy.id}`} className="font-semibold hover:underline">
                {strategy.name}
              </Link>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[strategy.type] || 'bg-gray-100'}`}
              >
                {strategy.type.toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ExchangeIcon exchange={strategy.exchange} size={14} />
              {strategy.exchange.toUpperCase()}
              <span className="mx-0.5">:</span>
              <CoinIcon symbol={strategy.symbol} size={14} />
              {strategy.symbol}
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className={strategy.mode === 'auto' ? 'text-green-600' : 'text-blue-600'}>
                {strategy.mode}
              </span>
              <span
                className={strategy.tradingMode === 'paper' ? 'text-purple-600' : 'text-orange-600'}
              >
                {strategy.tradingMode}
              </span>
              <span>{strategy.intervalSeconds}s interval</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                strategy.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  strategy.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
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
      </CardContent>
    </Card>
  );
}

function CreateStrategyForm({
  keys,
  onSuccess,
}: {
  keys: ExchangeKeyItem[];
  onSuccess: () => void;
}) {
  const t = useTranslations('strategies');
  const { tickers } = useTickers();
  const [name, setName] = useState('');
  const [type, setType] = useState('rsi');
  const [exchange, setExchange] = useState('');
  const [symbol, setSymbol] = useState('');
  const [mode, setMode] = useState<'auto' | 'signal'>('signal');
  const [tradingMode, setTradingMode] = useState<'paper' | 'real'>('paper');
  const [intervalSeconds, setIntervalSeconds] = useState('60');
  const [config, setConfig] = useState<Record<string, unknown>>(DEFAULT_CONFIGS.rsi);
  const [riskStopLoss, setRiskStopLoss] = useState('');
  const [riskDailyMax, setRiskDailyMax] = useState('');
  const [riskMaxPosition, setRiskMaxPosition] = useState('');
  const [error, setError] = useState('');

  const activeExchanges = [...new Set(tickers.map((t) => t.exchange))];
  const activeSymbols = tickers.filter((t) => t.exchange === exchange);

  const mutation = useMutation({
    mutationFn: createStrategy,
    onSuccess: () => {
      onSuccess();
      setName('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleTypeChange = (newType: string) => {
    setType(newType);
    setConfig({ ...DEFAULT_CONFIGS[newType] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const riskConfig: Record<string, unknown> = {};
    if (riskStopLoss) riskConfig.stopLossPercent = Number(riskStopLoss);
    if (riskDailyMax) riskConfig.dailyMaxLossUsd = Number(riskDailyMax);
    if (riskMaxPosition) riskConfig.maxPositionSize = riskMaxPosition;

    const exchangeKey = keys.find((k) => k.exchange === exchange);

    mutation.mutate({
      name,
      type,
      exchange,
      symbol,
      mode,
      tradingMode,
      ...(tradingMode === 'real' && exchangeKey ? { exchangeKeyId: exchangeKey.id } : {}),
      config,
      riskConfig: Object.keys(riskConfig).length > 0 ? riskConfig : undefined,
      intervalSeconds: Number(intervalSeconds),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('newStrategy')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t('type')}</Label>
            <div className="flex gap-2">
              {STRATEGY_TYPES.map((st) => (
                <Button
                  key={st.value}
                  type="button"
                  variant={type === st.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange(st.value)}
                >
                  {st.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('exchange')}</Label>
            <div className="flex gap-2">
              {activeExchanges.map((ex) => (
                <Button
                  key={ex}
                  type="button"
                  variant={exchange === ex ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setExchange(ex);
                    setSymbol('');
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <ExchangeIcon exchange={ex} size={16} />
                    {ex.charAt(0).toUpperCase() + ex.slice(1)}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {exchange && (
            <div className="space-y-2">
              <Label>{t('symbol')}</Label>
              <div className="flex gap-2 flex-wrap">
                {activeSymbols.map((t) => (
                  <Button
                    key={t.symbol}
                    type="button"
                    variant={symbol === t.symbol ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSymbol(t.symbol)}
                  >
                    <span className="flex items-center gap-1.5">
                      <CoinIcon symbol={t.symbol} size={16} />
                      {t.symbol}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Strategy config */}
          <div className="space-y-2">
            <Label>{t('params')}</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(config).map(([key, val]) => (
                <div key={key}>
                  <Label className="text-xs text-muted-foreground">{key}</Label>
                  <Input
                    value={String(val)}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        [key]: isNaN(Number(e.target.value))
                          ? e.target.value
                          : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Risk config */}
          <div className="space-y-2">
            <Label>{t('risk')}</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{t('stopLoss')}</Label>
                <Input
                  value={riskStopLoss}
                  onChange={(e) => setRiskStopLoss(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('dailyMaxLoss')}</Label>
                <Input
                  value={riskDailyMax}
                  onChange={(e) => setRiskDailyMax(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('maxPosition')}</Label>
                <Input
                  value={riskMaxPosition}
                  onChange={(e) => setRiskMaxPosition(e.target.value)}
                  placeholder="0.1"
                />
              </div>
            </div>
          </div>

          {/* Mode toggles */}
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>{t('mode')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'signal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('signal')}
                >
                  {t('signal')}
                </Button>
                <Button
                  type="button"
                  variant={mode === 'auto' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('auto')}
                >
                  {t('auto')}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('trading')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tradingMode === 'paper' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTradingMode('paper')}
                >
                  {t('paper')}
                </Button>
                <Button
                  type="button"
                  variant={tradingMode === 'real' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTradingMode('real')}
                >
                  {t('real')}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('interval')}</Label>
            <Input
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(e.target.value)}
              type="number"
              min="10"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !exchange || !symbol || !name}
          >
            {mutation.isPending ? t('creating') : t('create')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function StrategiesPage() {
  const t = useTranslations('strategies');
  const queryClient = useQueryClient();

  const { data: strategies = [], isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: getStrategies,
  });

  const { data: keys = [] } = useQuery({
    queryKey: ['exchangeKeys'],
    queryFn: getExchangeKeys,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleStrategy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStrategy,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['strategies'] }),
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CreateStrategyForm
            keys={keys}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['strategies'] })}
          />
        </div>
        <div className="lg:col-span-2 space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && strategies.length === 0 && (
            <p className="text-center text-muted-foreground py-8">{t('noStrategies')}</p>
          )}
          {strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              onToggle={() => toggleMutation.mutate(s.id)}
              onDelete={() => deleteMutation.mutate(s.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
