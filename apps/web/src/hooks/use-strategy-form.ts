'use client';

import { useMemo } from 'react';
import type { ExchangeKeyItem } from '@/lib/api-client';
import { useBalances } from './use-balances';

interface UseStrategyFormOptions {
  exchange: string;
  tradingMode: 'paper' | 'real';
  keys: ExchangeKeyItem[];
}

export function useStrategyForm({ exchange, tradingMode, keys }: UseStrategyFormOptions) {
  const exchangeKey = useMemo(() => keys.find((k) => k.exchange === exchange), [keys, exchange]);

  const { data: balances } = useBalances(exchangeKey?.id, !!exchangeKey && tradingMode === 'real');

  const quoteCurrency = exchange === 'upbit' ? 'KRW' : 'USDT';
  const quoteBalance = balances?.find((b) => b.currency === quoteCurrency);

  return {
    exchangeKey,
    balances,
    quoteBalance,
    quoteCurrency,
  };
}
