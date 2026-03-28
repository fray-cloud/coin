'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { getExchangeKeys } from '@/lib/api-client';
import { useTickers } from '@/hooks/use-tickers';
import { useOrderUpdates } from '@/hooks/use-order-updates';
import { useUser } from '@/hooks/use-user';
import { useTranslations } from 'next-intl';
import { CandleChart } from '@/components/candle-chart';
import { OrderForm } from '@/components/orders/order-form';
import { OrdersTable } from '@/components/orders/orders-table';

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
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
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
