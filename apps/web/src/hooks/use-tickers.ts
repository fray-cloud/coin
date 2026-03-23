'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Ticker } from '@coin/types';

export function useTickers() {
  const [tickers, setTickers] = useState<Map<string, Ticker>>(new Map());
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({
      path: '/ws',
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('ticker', (ticker: Ticker) => {
      setTickers((prev) => {
        const next = new Map(prev);
        next.set(`${ticker.exchange}:${ticker.symbol}`, ticker);
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { tickers: Array.from(tickers.values()), connected };
}
