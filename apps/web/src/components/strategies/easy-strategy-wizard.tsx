'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ExchangeIcon, CoinIcon } from '@/components/icons';
import { createStrategy, type ExchangeKeyItem } from '@/lib/api-client';
import { useTickers } from '@/hooks/use-tickers';
import { useExchangeRate } from '@/hooks/use-exchange-rate';
import { useBaseCurrency } from '@/hooks/use-base-currency';
import { getPreset, TENDENCIES, GOALS, type Tendency, type Goal } from '@/lib/strategy-presets';

interface EasyStrategyWizardProps {
  keys: ExchangeKeyItem[];
  onSuccess: () => void;
}

export function EasyStrategyWizard({ keys, onSuccess }: EasyStrategyWizardProps) {
  const t = useTranslations('strategies');
  const queryClient = useQueryClient();
  const { tickers } = useTickers();
  const { krwPerUsd } = useExchangeRate();
  const { currency: baseCurrency } = useBaseCurrency();
  const [step, setStep] = useState(0);

  const [tendency, setTendency] = useState<Tendency | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [exchange, setExchange] = useState('');
  const [symbol, setSymbol] = useState('');
  const [tradingMode, setTradingMode] = useState<'paper' | 'real'>('paper');
  const [quantity, setQuantity] = useState('0.001');
  const [paperCapital, setPaperCapital] = useState('100000000');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const activeExchanges = [...new Set(tickers.map((t) => t.exchange))];
  const activeSymbols = tickers.filter((t) => t.exchange === exchange);
  const preset = tendency && goal ? getPreset(tendency, goal) : null;

  const mutation = useMutation({
    mutationFn: createStrategy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
      onSuccess();
      setStep(0);
      setTendency(null);
      setGoal(null);
      setExchange('');
      setSymbol('');
      setName('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleCreate = () => {
    if (!preset || !exchange || !symbol || !name) return;
    const exchangeKey = keys.find((k) => k.exchange === exchange);
    mutation.mutate({
      name,
      type: preset.type,
      exchange,
      symbol,
      mode: 'signal',
      tradingMode,
      ...(tradingMode === 'real' && exchangeKey ? { exchangeKeyId: exchangeKey.id } : {}),
      config: {
        ...preset.config,
        quantity,
        ...(tradingMode === 'paper' && paperCapital ? { paperCapital: Number(paperCapital) } : {}),
      },
      riskConfig: Object.keys(preset.riskConfig).length > 0 ? preset.riskConfig : undefined,
      intervalSeconds: preset.intervalSeconds,
      candleInterval: preset.candleInterval,
    });
  };

  const canNext =
    (step === 0 && tendency !== null) ||
    (step === 1 && goal !== null) ||
    (step === 2 && exchange && symbol) ||
    (step === 3 && name);

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Tendency */}
        {step === 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">투자 성향을 선택하세요</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TENDENCIES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTendency(t.value)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    tendency === t.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="text-2xl mb-1">{t.emoji}</p>
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="font-semibold">투자 목표를 선택하세요</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    goal === g.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <p className="text-2xl mb-1">{g.emoji}</p>
                  <p className="font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Exchange + Symbol */}
        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold">거래소와 코인을 선택하세요</h3>
            <div className="flex gap-2 flex-wrap">
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
                  <ExchangeIcon exchange={ex} size={16} className="mr-1.5" />
                  {ex.charAt(0).toUpperCase() + ex.slice(1)}
                </Button>
              ))}
            </div>
            {exchange && (
              <div className="flex gap-2 flex-wrap">
                {activeSymbols.map((t) => (
                  <Button
                    key={t.symbol}
                    type="button"
                    variant={symbol === t.symbol ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSymbol(t.symbol)}
                  >
                    <CoinIcon symbol={t.symbol} size={16} className="mr-1.5" />
                    {t.symbol}
                  </Button>
                ))}
              </div>
            )}
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

            {/* Quantity */}
            <div className="space-y-1">
              <Label className="text-sm">{t('quantity') || '주문 수량'}</Label>
              <Input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                type="number"
                step="0.001"
                min="0.0001"
                placeholder="0.001"
              />
              {symbol &&
                preset &&
                (() => {
                  const tickerPrice = Number(
                    tickers.find((tk) => tk.exchange === exchange && tk.symbol === symbol)?.price ||
                      0,
                  );
                  const rawCost = Number(quantity) * tickerPrice;
                  if (rawCost <= 0) return null;
                  const isKrw = exchange === 'upbit';
                  const needsConversion =
                    (baseCurrency === 'KRW' && !isKrw) || (baseCurrency === 'USD' && isKrw);
                  let displayCost = rawCost;
                  if (needsConversion && krwPerUsd > 0) {
                    displayCost = isKrw ? rawCost / krwPerUsd : rawCost * krwPerUsd;
                  }
                  const baseSym = baseCurrency === 'KRW' ? '₩' : '$';
                  const origSym = isKrw ? '₩' : '$';
                  const origCurrency = isKrw ? 'KRW' : 'USDT';
                  return (
                    <p className="text-xs text-muted-foreground">
                      ≈ {baseSym}
                      {displayCost.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}
                      {needsConversion && (
                        <span className="ml-1 opacity-60">
                          ({origSym}
                          {rawCost.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}{' '}
                          {origCurrency})
                        </span>
                      )}
                    </p>
                  );
                })()}
            </div>

            {/* Paper Capital */}
            {tradingMode === 'paper' && (
              <div className="space-y-1">
                <Label className="text-sm">가상 자본</Label>
                <Input
                  value={paperCapital}
                  onChange={(e) => setPaperCapital(e.target.value)}
                  type="number"
                  placeholder={exchange === 'upbit' ? '100,000,000 KRW' : '100,000 USDT'}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Name + Summary */}
        {step === 3 && preset && (
          <div className="space-y-4">
            <h3 className="font-semibold">전략 이름을 입력하세요</h3>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="내 전략"
              required
            />

            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium">전략 요약</p>
              <p className="text-muted-foreground">{preset.description}</p>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div>
                  <span className="text-muted-foreground">유형: </span>
                  <span className="font-medium">{preset.type.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">봉: </span>
                  <span className="font-medium">{preset.candleInterval}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">거래소: </span>
                  <span className="font-medium capitalize">{exchange}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">심볼: </span>
                  <span className="font-medium">{symbol}</span>
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ArrowLeft size={14} />
            이전
          </Button>
          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="gap-1"
            >
              다음
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!canNext || mutation.isPending}
              className="gap-1"
            >
              <Check size={14} />
              {mutation.isPending ? '생성 중...' : '전략 생성'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
