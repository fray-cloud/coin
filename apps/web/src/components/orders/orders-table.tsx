'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cancelOrder } from '@/lib/api-client';
import { useOrders } from '@/hooks/use-orders';
import { useTranslations } from 'next-intl';
import { ExchangeIcon, CoinIcon } from '@/components/icons';

type SortKey = 'createdAt' | 'exchange' | 'symbol' | 'status';
type SortDir = 'asc' | 'desc';
type MobileTab = 'open' | 'closed';

function SortIcon({
  column,
  sortKey,
  sortDir,
}: {
  column: SortKey;
  sortKey: SortKey | null;
  sortDir: SortDir;
}) {
  if (sortKey !== column) return <ArrowUpDown size={14} className="inline ml-1 opacity-40" />;
  return sortDir === 'asc' ? (
    <ArrowUp size={14} className="inline ml-1" />
  ) : (
    <ArrowDown size={14} className="inline ml-1" />
  );
}

const STATUS_VARIANT: Record<string, 'warning' | 'info' | 'success' | 'cyan' | 'muted' | 'error'> =
  {
    pending: 'warning',
    placed: 'info',
    filled: 'success',
    partial: 'cyan',
    cancelled: 'muted',
    failed: 'error',
  };

const OPEN_STATUSES = new Set(['pending', 'placed']);

export function OrdersTable() {
  const t = useTranslations('orders');
  const queryClient = useQueryClient();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [mobileTab, setMobileTab] = useState<MobileTab>('open');

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders();

  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const orders = data?.pages.flatMap((p) => p.items) ?? [];

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'all') result = result.filter((o) => o.status === statusFilter);
    if (modeFilter !== 'all') result = result.filter((o) => o.mode === modeFilter);
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        const cmp = String(av).localeCompare(String(bv));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [orders, statusFilter, modeFilter, sortKey, sortDir]);

  const mobileOrders = useMemo(() => {
    return filteredOrders.filter((o) =>
      mobileTab === 'open' ? OPEN_STATUSES.has(o.status) : !OPEN_STATUSES.has(o.status),
    );
  }, [filteredOrders, mobileTab]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const statusOptions = ['all', 'pending', 'filled', 'failed', 'cancelled'] as const;
  const modeOptions = ['all', 'paper', 'real'] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('history')}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-2 mb-4">
          <div>
            <span className="text-xs text-muted-foreground mr-2">{t('status')}:</span>
            <div className="flex gap-1 flex-wrap mb-3">
              {statusOptions.map((s) => (
                <Button
                  key={s}
                  variant={statusFilter === s ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : s}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground mr-2">{t('mode')}:</span>
            <div className="flex gap-1 flex-wrap mb-3">
              {modeOptions.map((m) => (
                <Button
                  key={m}
                  variant={modeFilter === m ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModeFilter(m)}
                >
                  {m === 'all' ? 'All' : m}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}

        {/* Desktop table — hidden on mobile */}
        {filteredOrders.length > 0 && (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th
                    className="pb-2 font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('createdAt')}
                  >
                    {t('time')}
                    <SortIcon column="createdAt" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    className="pb-2 font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('exchange')}
                  >
                    {t('exchange')}
                    <SortIcon column="exchange" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th
                    className="pb-2 font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('symbol')}
                  >
                    {t('symbol')}
                    <SortIcon column="symbol" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="pb-2 font-medium">{t('side')}</th>
                  <th className="pb-2 font-medium">{t('type')}</th>
                  <th className="pb-2 font-medium text-right">{t('qty')}</th>
                  <th className="pb-2 font-medium text-right">{t('priceLabel')}</th>
                  <th className="pb-2 font-medium text-right">{t('filled')}</th>
                  <th className="pb-2 font-medium">{t('mode')}</th>
                  <th
                    className="pb-2 font-medium cursor-pointer select-none"
                    onClick={() => toggleSort('status')}
                  >
                    {t('status')}
                    <SortIcon column="status" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
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
                      className={`py-2 font-medium ${order.side === 'buy' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
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
                        className={`text-xs ${order.mode === 'paper' ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}
                      >
                        {order.mode}
                      </span>
                    </td>
                    <td className="py-2">
                      <Badge variant={STATUS_VARIANT[order.status] ?? 'muted'}>
                        {order.status}
                      </Badge>
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

        {/* Mobile card view — visible only on mobile */}
        <div className="md:hidden">
          {/* Tabs */}
          <div className="flex border-b mb-3">
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mobileTab === 'open'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setMobileTab('open')}
            >
              {t('openOrders')}
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mobileTab === 'closed'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setMobileTab('closed')}
            >
              {t('closedOrders')}
            </button>
          </div>

          {/* Cards */}
          {mobileOrders.length === 0 && !isLoading && (
            <p className="text-center text-muted-foreground py-8">{t('noOrders')}</p>
          )}
          <div className="space-y-2">
            {mobileOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-3 space-y-2">
                {/* Top row: symbol + status */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CoinIcon symbol={order.symbol} size={16} />
                    {order.symbol}
                  </span>
                  <Badge variant={STATUS_VARIANT[order.status] ?? 'muted'}>{order.status}</Badge>
                </div>

                {/* Middle row: side + qty + price */}
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={`font-semibold ${order.side === 'buy' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {order.side === 'buy' ? t('buy') : t('sell')}
                  </span>
                  <span className="text-muted-foreground">
                    {t('qty')}:{' '}
                    <span className="text-foreground tabular-nums">{order.quantity}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {t('priceLabel')}:{' '}
                    <span className="text-foreground tabular-nums">
                      {order.type === 'market' ? '-' : order.price || '-'}
                    </span>
                  </span>
                </div>

                {/* Bottom row: exchange + time + cancel */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ExchangeIcon exchange={order.exchange} size={12} />
                    <span className="capitalize">{order.exchange}</span>
                    <span
                      className={`ml-1 ${order.mode === 'paper' ? 'text-purple-600 dark:text-purple-400' : 'text-orange-600 dark:text-orange-400'}`}
                    >
                      {order.mode}
                    </span>
                  </span>
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                </div>

                {['pending', 'placed'].includes(order.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7 text-xs w-full"
                    onClick={() => cancelMutation.mutate(order.id)}
                    disabled={cancelMutation.isPending}
                  >
                    {t('cancel')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {!isLoading && filteredOrders.length === 0 && (
          <p className="text-center text-muted-foreground py-8 hidden md:block">{t('noOrders')}</p>
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
