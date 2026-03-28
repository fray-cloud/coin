'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cancelOrder } from '@/lib/api-client';
import { useOrders } from '@/hooks/use-orders';
import { useTranslations } from 'next-intl';
import { ExchangeIcon, CoinIcon } from '@/components/icons';

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

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders();

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
