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
  getBalances,
  type ExchangeKeyItem,
} from '@/lib/api-client';
import { useTranslations } from 'next-intl';
import { useTickers } from '@/hooks/use-tickers';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { MiniChart } from '@/components/mini-chart';
import { StrategyChart } from '@/components/strategy-chart';

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

const PARAM_TOOLTIPS: Record<string, string> = {
  period: 'RSI/볼린저 계산에 사용할 캔들 수. 클수록 변동이 완만해짐',
  overbought: 'RSI가 이 값 이상이면 과매수 구간. 매도 시그널 기준',
  oversold: 'RSI가 이 값 이하이면 과매도 구간. 매수 시그널 기준',
  fastPeriod: 'MACD 빠른 EMA 기간. 단기 추세를 반영',
  slowPeriod: 'MACD 느린 EMA 기간. 장기 추세를 반영',
  signalPeriod: 'MACD 시그널 라인 EMA 기간. 매매 타이밍 판단용',
  stdDev: '볼린저 밴드 폭을 결정하는 표준편차 배수. 클수록 밴드가 넓어짐',
  quantity: '한 번 주문 시 거래할 수량',
  stopLossPercent: '손실이 이 비율에 도달하면 자동 손절',
  dailyMaxLossUsd: '하루 최대 허용 손실 금액 (USD)',
  maxPositionSize: '최대 보유 가능한 포지션 크기',
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
  const [paperCapital, setPaperCapital] = useState('100000000');
  const [error, setError] = useState('');

  const activeExchanges = [...new Set(tickers.map((t) => t.exchange))];
  const activeSymbols = tickers.filter((t) => t.exchange === exchange);

  // Fetch balance for real mode
  const exchangeKey = keys.find((k) => k.exchange === exchange);
  const { data: balances } = useQuery({
    queryKey: ['balances', exchangeKey?.id],
    queryFn: () => getBalances(exchangeKey!.id),
    enabled: !!exchangeKey && tradingMode === 'real',
    staleTime: 30_000,
  });
  const quoteCurrency = exchange === 'upbit' ? 'KRW' : 'USDT';
  const quoteBalance = balances?.find((b) => b.currency === quoteCurrency);

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
      config: {
        ...config,
        ...(tradingMode === 'paper' && paperCapital ? { paperCapital: Number(paperCapital) } : {}),
      },
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
            />
          </div>
        )}
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
