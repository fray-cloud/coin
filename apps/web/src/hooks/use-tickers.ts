'use client';

import { useEffect, useMemo } from 'react';
import { useTickersStore } from '@/stores/use-tickers-store';

export function useTickers() {
  const connect = useTickersStore((s) => s.connect);
  const disconnect = useTickersStore((s) => s.disconnect);
  const connected = useTickersStore((s) => s.connected);
  const tickers = useTickersStore((s) => s.tickers);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const tickersArray = useMemo(() => Array.from(tickers.values()), [tickers]);

  return { tickers: tickersArray, connected };
}
