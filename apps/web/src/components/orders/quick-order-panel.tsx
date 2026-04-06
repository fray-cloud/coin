'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Ticker } from '@coin/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog } from '@/components/ui/dialog';
import { CoinIcon, ExchangeIcon } from '@/components/icons';
import { LivePrice } from './live-price';
import { createOrder } from '@/lib/api-client';
import { useOrderForm } from '@/hooks/use-order-form';
import { useExchangeKeys } from '@/hooks/use-exchange-keys';
import { useTickers } from '@/hooks/use-tickers';
import { formatPrice } from '@/lib/utils';

interface QuickOrderPanelProps {
  ticker: Ticker | null;
  onClose: () => void;
}

export function QuickOrderPanel({ ticker, onClose }: QuickOrderPanelProps) {
  const t = useTranslations('orders');
  const { data: keys = [] } = useExchangeKeys();
  const { tickers } = useTickers();

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [type, setType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [mode, setMode] = useState<'paper' | 'real'>('paper');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showRealConfirm, setShowRealConfirm] = useState(false);

  // Reset state when ticker changes
  useEffect(() => {
    setQuantity('');
    setPrice('');
    setError('');
    setSuccess(false);
    setSide('buy');
    setType('market');
  }, [ticker?.exchange, ticker?.symbol]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const exchange = ticker?.exchange ?? '';
  const symbol = ticker?.symbol ?? '';

  const { exchangeKeyId, quoteBalance, quoteCurrency } = useOrderForm({
    exchange,
    mode,
    keys,
    tickers,
  });

  // Get fresh live ticker from websocket feed
  const liveTicker =
    tickers.find((tk) => tk.exchange === exchange && tk.symbol === symbol) ?? ticker;

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      setQuantity('');
      setPrice('');
      setError('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveTicker) return;
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

  const open = !!ticker;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-in panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Quick Order Panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          {liveTicker ? (
            <div className="flex items-center gap-2">
              <CoinIcon symbol={liveTicker.symbol} size={22} />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <ExchangeIcon exchange={liveTicker.exchange} size={14} />
                  <span className="text-muted-foreground text-xs">
                    {liveTicker.exchange.toUpperCase()}
                  </span>
                  <span>{liveTicker.symbol}</span>
                </div>
                {liveTicker && <LivePrice ticker={liveTicker} />}
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Quick Order</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        {liveTicker && (
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === 'paper' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setMode('paper')}
                >
                  {t('paper')}
                </Button>
                <Button
                  type="button"
                  variant={mode === 'real' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    if (mode !== 'real') setShowRealConfirm(true);
                  }}
                >
                  {t('real')}
                </Button>
              </div>

              {/* Balance (real mode) */}
              {mode === 'real' && quoteBalance && (
                <div className="rounded-lg bg-muted/50 p-2.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">{quoteCurrency} 잔고</span>
                  <span className="font-bold tabular-nums">
                    {parseFloat(quoteBalance.free).toLocaleString('ko-KR', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    {quoteCurrency}
                  </span>
                </div>
              )}

              {/* Buy / Sell tabs */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('buy')}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    side === 'buy'
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-border hover:border-green-500 text-muted-foreground'
                  }`}
                >
                  {t('buy')}
                </button>
                <button
                  type="button"
                  onClick={() => setSide('sell')}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    side === 'sell'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'border-border hover:border-red-500 text-muted-foreground'
                  }`}
                >
                  {t('sell')}
                </button>
              </div>

              {/* Order type */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t('type')}</Label>
                <div className="flex gap-2">
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

              {/* Limit price */}
              {type === 'limit' && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('priceLabel')}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={liveTicker ? formatPrice(liveTicker.price) : '0'}
                    required
                  />
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t('quantity')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.001"
                  required
                />
                {quantity && Number(quantity) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ≈{' '}
                    {(
                      Number(quantity) *
                      Number(type === 'limit' && price ? price : liveTicker.price)
                    ).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}{' '}
                    {exchange === 'upbit' ? 'KRW' : 'USDT'}
                  </p>
                )}
              </div>

              {/* 24h stats */}
              <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                <div>
                  <div className="text-[10px] uppercase tracking-wide mb-0.5">High</div>
                  <div className="font-mono">{formatPrice(liveTicker.high24h)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide mb-0.5">Low</div>
                  <div className="font-mono">{formatPrice(liveTicker.low24h)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide mb-0.5">Vol</div>
                  <div className="font-mono">
                    {Number(liveTicker.volume24h).toLocaleString('ko-KR', {
                      maximumFractionDigits: 0,
                      notation: 'compact',
                    })}
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {mode === 'real' && !exchangeKeyId && (
                <p className="text-xs text-yellow-600 bg-yellow-500/10 rounded-md p-2">
                  {t('noKeyWarning', { exchange })}
                </p>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md p-2">{error}</p>
              )}

              {success && (
                <p className="text-xs text-green-600 bg-green-500/10 rounded-md p-2">
                  주문이 제출되었습니다.
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={mutation.isPending || (mode === 'real' && !exchangeKeyId)}
                className={`w-full font-semibold ${
                  side === 'buy' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {mutation.isPending
                  ? t('submitting')
                  : side === 'buy'
                    ? t('buySymbol', { symbol })
                    : t('sellSymbol', { symbol })}
              </Button>
            </form>
          </div>
        )}
      </aside>

      <Dialog
        open={showRealConfirm}
        onClose={() => setShowRealConfirm(false)}
        title={t('realModeConfirmTitle')}
        description={t('realModeConfirmDesc')}
        confirmLabel={t('realModeConfirmBtn')}
        cancelLabel={t('realModeConfirmCancel')}
        variant="destructive"
        onConfirm={() => setMode('real')}
      />
    </>
  );
}
