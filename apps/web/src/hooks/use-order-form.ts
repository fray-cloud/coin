'use client';

import { useMemo } from 'react';
import type { Ticker } from '@coin/types';
import type { ExchangeKeyItem } from '@/lib/api-client';
import { useBalances } from './use-balances';

interface UseOrderFormOptions {
  exchange: string;
  mode: 'paper' | 'real';
  keys: ExchangeKeyItem[];
  tickers: Ticker[];
}

export function useOrderForm({ exchange, mode, keys, tickers }: UseOrderFormOptions) {
  const exchangeKey = useMemo(() => keys.find((k) => k.exchange === exchange), [keys, exchange]);

  const { data: balances } = useBalances(exchangeKey?.id, !!exchangeKey && mode === 'real');

  const quoteCurrency = exchange === 'upbit' ? 'KRW' : 'USDT';
  const quoteBalance = balances?.find((b) => b.currency === quoteCurrency);

  const activeExchanges = useMemo(() => [...new Set(tickers.map((t) => t.exchange))], [tickers]);

  const activeSymbols = useMemo(
    () => tickers.filter((t) => t.exchange === exchange),
    [tickers, exchange],
  );

  return {
    exchangeKeyId: exchangeKey?.id ?? '',
    balances,
    quoteBalance,
    quoteCurrency,
    activeExchanges,
    activeSymbols,
  };
}
