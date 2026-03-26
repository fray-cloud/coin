'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  getExchangeKeys,
  getOrders,
  createOrder,
  cancelOrder,
  getBalances,
  type ExchangeKeyItem,
  type BalanceItem,
} from '@/lib/api-client';
import { useTickers } from '@/hooks/use-tickers';
import { useOrderUpdates } from '@/hooks/use-order-updates';
import { useUser } from '@/hooks/use-user';
import { useTranslations } from 'next-intl';
import type { Ticker } from '@coin/types';
import { CoinIcon, ExchangeIcon } from '@/components/icons';
import { CandleChart } from '@/components/candle-chart';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  placed: 'bg-blue-100 text-blue-800',
  filled: 'bg-green-100 text-green-800',
  partial: 'bg-cyan-100 text-cyan-800',
  cancelled: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-800',
};

function formatPrice(price: string): string {
  const num = Number(price);
  if (num >= 1000) return num.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
  if (num >= 1) return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  return num.toLocaleString('ko-KR', { maximumFractionDigits: 8 });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}

// 실시간 가격 표시 + 가격 변동 시 깜빡임
function LivePrice({ ticker }: { ticker: Ticker }) {
  const prevPrice = useRef(ticker.price);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (ticker.price !== prevPrice.current) {
      const direction = Number(ticker.price) > Number(prevPrice.current) ? 'up' : 'down';
      setFlash(direction);
      prevPrice.current = ticker.price;
      const timer = setTimeout(() => setFlash(null), 300);
      return () => clearTimeout(timer);
    }
  }, [ticker.price]);

  const changeNum = Number(ticker.changePercent24h);
  const changeColor =
    changeNum > 0 ? 'text-green-500' : changeNum < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={`text-2xl font-bold tabular-nums transition-colors duration-300 ${
          flash === 'up' ? 'text-green-400' : flash === 'down' ? 'text-red-400' : ''
        }`}
      >
        {formatPrice(ticker.price)}
      </span>
      <span className={`text-sm font-medium ${changeColor}`}>
        {changeNum > 0 ? '+' : ''}
        {changeNum.toFixed(2)}%
      </span>
    </div>
  );
}

// 심볼 선택 카드 (클릭 가능, 실시간 가격)
function SymbolCard({
  ticker,
  selected,
  onClick,
}: {
  ticker: Ticker;
  selected: boolean;
  onClick: () => void;
}) {
  const changeNum = Number(ticker.changePercent24h);
  const changeColor =
    changeNum > 0 ? 'text-green-500' : changeNum < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm flex items-center gap-1.5">
          <CoinIcon symbol={ticker.symbol} size={16} />
          {ticker.symbol}
        </span>
        <span className={`text-xs font-medium ${changeColor}`}>
          {changeNum > 0 ? '+' : ''}
          {changeNum.toFixed(2)}%
        </span>
      </div>
      <div className="text-base font-bold tabular-nums mt-0.5">{formatPrice(ticker.price)}</div>
      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
        <span>H {formatPrice(ticker.high24h)}</span>
        <span>L {formatPrice(ticker.low24h)}</span>
      </div>
    </button>
  );
}

function OrderForm({
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
  const [exchangeKeyId, setExchangeKeyId] = useState('');
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [type, setType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [mode, setMode] = useState<'paper' | 'real'>('paper');
  const [error, setError] = useState('');
  const t = useTranslations('orders');

  // 활성 티커에서 거래소 목록 추출
  const activeExchanges = [...new Set(tickers.map((t) => t.exchange))];

  // 선택된 거래소의 활성 심볼
  const activeSymbols = tickers.filter((t) => t.exchange === exchange);

  // 선택된 심볼의 실시간 티커
  const selectedTicker = tickers.find((t) => t.exchange === exchange && t.symbol === symbol);

  // Notify parent of selection
  useEffect(() => {
    onSelectionChange?.(exchange, symbol);
  }, [exchange, symbol, onSelectionChange]);

  // 거래소 선택 시 해당 키 자동 설정
  useEffect(() => {
    const key = keys.find((k) => k.exchange === exchange);
    if (key) setExchangeKeyId(key.id);
    else setExchangeKeyId('');
    setSymbol('');
  }, [exchange, keys]);

  // Fetch balances for selected exchange
  const { data: balances } = useQuery({
    queryKey: ['balances', exchangeKeyId],
    queryFn: () => getBalances(exchangeKeyId),
    enabled: !!exchangeKeyId && mode === 'real',
    staleTime: 30_000,
  });

  // Get quote currency balance (KRW for upbit, USDT for binance/bybit)
  const quoteCurrency = exchange === 'upbit' ? 'KRW' : 'USDT';
  const quoteBalance = balances?.find((b) => b.currency === quoteCurrency);

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
            <div className="flex gap-2">
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
                {activeSymbols.map((t) => (
                  <SymbolCard
                    key={t.symbol}
                    ticker={t}
                    selected={symbol === t.symbol}
                    onClick={() => setSymbol(t.symbol)}
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
                <div className="flex gap-2">
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

function OrdersTable() {
  const t = useTranslations('orders');
  const queryClient = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['orders'],
    queryFn: ({ pageParam }) => getOrders(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10_000,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const orders = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('history')}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}

        {orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">{t('time')}</th>
                  <th className="pb-2 font-medium">{t('exchange')}</th>
                  <th className="pb-2 font-medium">{t('symbol')}</th>
                  <th className="pb-2 font-medium">{t('side')}</th>
                  <th className="pb-2 font-medium">{t('type')}</th>
                  <th className="pb-2 font-medium text-right">{t('qty')}</th>
                  <th className="pb-2 font-medium text-right">{t('priceLabel')}</th>
                  <th className="pb-2 font-medium text-right">{t('filled')}</th>
                  <th className="pb-2 font-medium">{t('mode')}</th>
                  <th className="pb-2 font-medium">{t('status')}</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2">
                      <span className="flex items-center gap-1.5">
                        <ExchangeIcon exchange={order.exchange} size={16} />
                        <span className="capitalize">{order.exchange}</span>
                      </span>
                    </td>
                    <td className="py-2 font-medium">
                      <span className="flex items-center gap-1.5">
                        <CoinIcon symbol={order.symbol} size={16} />
                        {order.symbol}
                      </span>
                    </td>
                    <td
                      className={`py-2 font-medium ${order.side === 'buy' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {order.side.toUpperCase()}
                    </td>
                    <td className="py-2">{order.type}</td>
                    <td className="py-2 text-right tabular-nums">{order.quantity}</td>
                    <td className="py-2 text-right tabular-nums">
                      {order.type === 'market' ? '-' : order.price || '-'}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {order.filledQuantity !== '0'
                        ? `${order.filledQuantity} @ ${order.filledPrice}`
                        : '-'}
                    </td>
                    <td className="py-2">
                      <span
                        className={`text-xs ${order.mode === 'paper' ? 'text-purple-600' : 'text-orange-600'}`}
                      >
                        {order.mode}
                      </span>
                    </td>
                    <td className="py-2">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-2">
                      {['pending', 'placed'].includes(order.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-7 text-xs"
                          onClick={() => cancelMutation.mutate(order.id)}
                          disabled={cancelMutation.isPending}
                        >
                          {t('cancel')}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t('noOrders')}</p>
        )}

        {hasNextPage && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? t('loading') : t('loadMore')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrdersPage() {
  const t = useTranslations('orders');
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [selectedExchange, setSelectedExchange] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState('');

  const { data: keys = [] } = useQuery({
    queryKey: ['exchangeKeys'],
    queryFn: getExchangeKeys,
  });

  const { tickers } = useTickers();

  useOrderUpdates(user?.id ?? null);

  const handleSelectionChange = (exchange: string, symbol: string) => {
    setSelectedExchange(exchange);
    setSelectedSymbol(symbol);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {selectedExchange && selectedSymbol && (
        <Card>
          <CardContent className="pt-4">
            <CandleChart exchange={selectedExchange} symbol={selectedSymbol} height={300} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <OrderForm
            keys={keys}
            tickers={tickers}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
            onSelectionChange={handleSelectionChange}
          />
        </div>
        <div className="lg:col-span-2">
          <OrdersTable />
        </div>
      </div>
    </div>
  );
}
