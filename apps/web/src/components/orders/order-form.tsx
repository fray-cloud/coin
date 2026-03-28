'use client';

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { createOrder, type ExchangeKeyItem } from '@/lib/api-client';
import { useOrderForm } from '@/hooks/use-order-form';
import { useTranslations } from 'next-intl';
import type { Ticker } from '@coin/types';
import { ExchangeIcon } from '@/components/icons';
import { formatPrice } from '@/lib/utils';
import { LivePrice } from './live-price';
import { SymbolCard } from './symbol-card';

export function OrderForm({
  keys,
  tickers,
  onSuccess,
  onSelectionChange,
}: {
  keys: ExchangeKeyItem[];
  tickers: Ticker[];
  onSuccess: () => void;
  onSelectionChange?: (exchange: string, symbol: string) => void;
}) {
  const [exchange, setExchange] = useState('');
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [type, setType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [mode, setMode] = useState<'paper' | 'real'>('paper');
  const [error, setError] = useState('');
  const t = useTranslations('orders');

  const { exchangeKeyId, quoteBalance, quoteCurrency, activeExchanges, activeSymbols } =
    useOrderForm({ exchange, mode, keys, tickers });

  // 선택된 심볼의 실시간 티커
  const selectedTicker = tickers.find((tk) => tk.exchange === exchange && tk.symbol === symbol);

  // Notify parent of selection
  useEffect(() => {
    onSelectionChange?.(exchange, symbol);
  }, [exchange, symbol, onSelectionChange]);

  // 거래소 변경 시 심볼 초기화
  useEffect(() => {
    setSymbol('');
  }, [exchange]);

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      onSuccess();
      setQuantity('');
      setPrice('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate({
      exchange,
      symbol,
      side,
      type,
      quantity,
      ...(type === 'limit' ? { price } : {}),
      mode,
      ...(mode === 'real' ? { exchangeKeyId } : {}),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('newOrder')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'paper' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('paper')}
            >
              {t('paper')}
            </Button>
            <Button
              type="button"
              variant={mode === 'real' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('real')}
            >
              {t('real')}
            </Button>
          </div>

          {/* Balance display */}
          {mode === 'real' && exchange && quoteBalance && (
            <div className="rounded-lg bg-muted/50 p-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{quoteCurrency} 잔고</span>
              <span className="text-sm font-bold tabular-nums">
                {parseFloat(quoteBalance.free).toLocaleString('ko-KR', {
                  maximumFractionDigits: 2,
                })}{' '}
                {quoteCurrency}
              </span>
            </div>
          )}

          {/* Exchange */}
          <div className="space-y-2">
            <Label>{t('exchange')}</Label>
            <div className="flex gap-2 flex-wrap">
              {activeExchanges.map((ex) => (
                <Button
                  key={ex}
                  type="button"
                  variant={exchange === ex ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExchange(ex)}
                >
                  <span className="flex items-center gap-1.5">
                    <ExchangeIcon exchange={ex} size={16} />
                    {ex.charAt(0).toUpperCase() + ex.slice(1)}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Symbol selection - card grid with live prices */}
          {exchange && (
            <div className="space-y-2">
              <Label>{t('symbol')}</Label>
              <div className="grid grid-cols-1 gap-2">
                {activeSymbols.map((tk) => (
                  <SymbolCard
                    key={tk.symbol}
                    ticker={tk}
                    selected={symbol === tk.symbol}
                    onClick={() => setSymbol(tk.symbol)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 선택된 심볼 실시간 시세 */}
          {selectedTicker && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground mb-1">
                {selectedTicker.exchange.toUpperCase()} : {selectedTicker.symbol}
              </div>
              <LivePrice ticker={selectedTicker} />
              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                <span>High {formatPrice(selectedTicker.high24h)}</span>
                <span>Low {formatPrice(selectedTicker.low24h)}</span>
                <span>
                  Vol{' '}
                  {Number(selectedTicker.volume24h).toLocaleString('ko-KR', {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Side toggle */}
          {symbol && (
            <>
              <div className="space-y-2">
                <Label>{t('side')}</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant={side === 'buy' ? 'default' : 'outline'}
                    size="sm"
                    className={side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={() => setSide('buy')}
                  >
                    {t('buy')}
                  </Button>
                  <Button
                    type="button"
                    variant={side === 'sell' ? 'default' : 'outline'}
                    size="sm"
                    className={side === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => setSide('sell')}
                  >
                    {t('sell')}
                  </Button>
                </div>
              </div>

              {/* Type toggle */}
              <div className="space-y-2">
                <Label>{t('type')}</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant={type === 'market' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType('market')}
                  >
                    {t('market')}
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'limit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setType('limit')}
                  >
                    {t('limit')}
                  </Button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label>{t('quantity')}</Label>
                <Input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.001"
                  required
                />
                {quantity && selectedTicker && Number(quantity) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈{' '}
                    {(Number(quantity) * Number(selectedTicker.price)).toLocaleString('ko-KR', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    {exchange === 'upbit' ? 'KRW' : 'USDT'}
                  </p>
                )}
              </div>

              {/* Price (limit only) */}
              {type === 'limit' && (
                <div className="space-y-2">
                  <Label>{t('priceLabel')}</Label>
                  <Input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={selectedTicker ? formatPrice(selectedTicker.price) : '0'}
                    required
                  />
                </div>
              )}

              {mode === 'real' && exchange && !exchangeKeyId && (
                <p className="text-sm text-yellow-600">{t('noKeyWarning', { exchange })}</p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={mutation.isPending || (mode === 'real' && !exchangeKeyId)}
                className={`w-full ${side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {mutation.isPending
                  ? t('submitting')
                  : side === 'buy'
                    ? t('buySymbol', { symbol })
                    : t('sellSymbol', { symbol })}
              </Button>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
