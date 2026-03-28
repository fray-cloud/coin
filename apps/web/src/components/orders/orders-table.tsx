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

export function OrdersTable() {
  const t = useTranslations('orders');
  const queryClient = useQueryClient();

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');

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

        {filteredOrders.length > 0 && (
          <div className="overflow-x-auto">
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

        {!isLoading && filteredOrders.length === 0 && (
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
