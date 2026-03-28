'use client';

import { useQuery } from '@tanstack/react-query';
import { getCandles } from '@/lib/api-client';

export function useCandles(exchange: string, symbol: string, interval: string) {
  const staleTime = ['1m', '5m'].includes(interval) ? 30_000 : 60_000;

  return useQuery({
    queryKey: ['candles', exchange, symbol, interval],
    queryFn: () => getCandles(exchange, symbol, interval),
    staleTime,
    enabled: !!exchange && !!symbol,
  });
}
