'use client';

import { useEffect } from 'react';
import { useTickersStore } from '@/stores/use-tickers-store';

export function useTickers() {
  const connect = useTickersStore((s) => s.connect);
  const disconnect = useTickersStore((s) => s.disconnect);
  const connected = useTickersStore((s) => s.connected);
  const getTickersArray = useTickersStore((s) => s.getTickersArray);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { tickers: getTickersArray(), connected };
}
