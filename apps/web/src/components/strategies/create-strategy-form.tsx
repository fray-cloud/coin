'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { StrategyChart } from '@/components/strategy-chart';
import { useTickers } from '@/hooks/use-tickers';
import { useStrategyForm } from '@/hooks/use-strategy-form';
import { createStrategy, type ExchangeKeyItem } from '@/lib/api-client';
import { STRATEGY_TYPES, DEFAULT_CONFIGS, PARAM_TOOLTIPS } from '@/lib/constants';

export interface CreateStrategyFormProps {
  keys: ExchangeKeyItem[];
  onSuccess: () => void;
}

export function CreateStrategyForm({ keys, onSuccess }: CreateStrategyFormProps) {
  const t = useTranslations('strategies');
  const { tickers } = useTickers();
  const [name, setName] = useState('');
  const [type, setType] = useState('rsi');
  const [exchange, setExchange] = useState('');
  const [symbol, setSymbol] = useState('');
  const [mode, setMode] = useState<'auto' | 'signal'>('signal');
  const [tradingMode, setTradingMode] = useState<'paper' | 'real'>('paper');
  const [intervalSeconds, setIntervalSeconds] = useState('60');
  const [candleInterval, setCandleInterval] = useState('1h');
  const [config, setConfig] = useState<Record<string, unknown>>(DEFAULT_CONFIGS.rsi);
  const [riskStopLoss, setRiskStopLoss] = useState('');
  const [riskDailyMax, setRiskDailyMax] = useState('');
  const [riskMaxPosition, setRiskMaxPosition] = useState('');
  const [paperCapital, setPaperCapital] = useState('100000000');
  const [error, setError] = useState('');

  const activeExchanges = [...new Set(tickers.map((t) => t.exchange))];
  const activeSymbols = tickers.filter((t) => t.exchange === exchange);

  const { exchangeKey, quoteBalance, quoteCurrency } = useStrategyForm({
    exchange,
    tradingMode,
    keys,
  });

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

    const matchedKey = keys.find((k) => k.exchange === exchange);

    mutation.mutate({
      name,
      type,
      exchange,
      symbol,
      mode,
      tradingMode,
      ...(tradingMode === 'real' && matchedKey ? { exchangeKeyId: matchedKey.id } : {}),
      config: {
        ...config,
        ...(tradingMode === 'paper' && paperCapital ? { paperCapital: Number(paperCapital) } : {}),
      },
      riskConfig: Object.keys(riskConfig).length > 0 ? riskConfig : undefined,
      intervalSeconds: Number(intervalSeconds),
      candleInterval,
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
              {Object.entries(config).map(([key, val]) => {
                const selectedTicker = tickers.find(
                  (tk) => tk.exchange === exchange && tk.symbol === symbol,
                );
                const isQuantity = key === 'quantity';
                const estimatedCost =
                  isQuantity && selectedTicker ? Number(val) * Number(selectedTicker.price) : null;

                return (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      {key}
                      {PARAM_TOOLTIPS[key] && (
                        <span className="relative group cursor-help">
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            ?
                          </span>
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md w-48 hidden group-hover:block z-10">
                            {PARAM_TOOLTIPS[key]}
                          </span>
                        </span>
                      )}
                    </Label>
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
                    {estimatedCost !== null && estimatedCost > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ≈ {estimatedCost.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}{' '}
                        {exchange === 'upbit' ? 'KRW' : 'USDT'}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk config */}
          <div className="space-y-2">
            <Label>{t('risk')}</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  {t('stopLoss')}
                  <span className="relative group cursor-help">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      ?
                    </span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md w-48 hidden group-hover:block z-10">
                      {PARAM_TOOLTIPS.stopLossPercent}
                    </span>
                  </span>
                </Label>
                <Input
                  value={riskStopLoss}
                  onChange={(e) => setRiskStopLoss(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  {t('dailyMaxLoss')}
                  <span className="relative group cursor-help">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      ?
                    </span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md w-48 hidden group-hover:block z-10">
                      {PARAM_TOOLTIPS.dailyMaxLossUsd}
                    </span>
                  </span>
                </Label>
                <Input
                  value={riskDailyMax}
                  onChange={(e) => setRiskDailyMax(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  {t('maxPosition')}
                  <span className="relative group cursor-help">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      ?
                    </span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md w-48 hidden group-hover:block z-10">
                      {PARAM_TOOLTIPS.maxPositionSize}
                    </span>
                  </span>
                </Label>
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

          {/* Capital / Balance */}
          {exchange && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                {tradingMode === 'paper' ? '가상 자본' : '거래소 잔고'}
                {PARAM_TOOLTIPS.quantity && (
                  <span className="relative group cursor-help">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      ?
                    </span>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-xs bg-popover text-popover-foreground border rounded shadow-md w-48 hidden group-hover:block z-10">
                      {tradingMode === 'paper'
                        ? '모의 거래에 사용할 가상 초기 자본. 수익/손실 추적의 기준이 됨'
                        : '등록된 거래소에서 자동 조회된 잔고'}
                    </span>
                  </span>
                )}
              </Label>
              {tradingMode === 'paper' ? (
                <Input
                  value={paperCapital}
                  onChange={(e) => setPaperCapital(e.target.value)}
                  type="number"
                  placeholder={exchange === 'upbit' ? '100,000,000 KRW' : '100,000 USDT'}
                />
              ) : quoteBalance ? (
                <div className="rounded-lg bg-muted/50 p-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{quoteCurrency}</span>
                  <span className="text-sm font-bold tabular-nums">
                    {parseFloat(quoteBalance.free).toLocaleString('ko-KR', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    {quoteCurrency}
                  </span>
                </div>
              ) : exchangeKey ? (
                <p className="text-xs text-muted-foreground">잔고 조회 중...</p>
              ) : (
                <p className="text-xs text-yellow-600">해당 거래소 API 키가 등록되지 않았습니다</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('candleInterval')}</Label>
            <div className="flex gap-1">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((iv) => (
                <Button
                  key={iv}
                  type="button"
                  variant={candleInterval === iv ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCandleInterval(iv)}
                >
                  {iv}
                </Button>
              ))}
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

        {/* Preview chart with selected indicator */}
        {exchange && symbol && (
          <div className="mt-4 pt-4 border-t">
            <StrategyChart
              exchange={exchange}
              symbol={symbol}
              strategyType={type}
              config={config}
              intervalSeconds={Number(intervalSeconds)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
