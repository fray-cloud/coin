/**
 * Demo mode: connect directly to Binance public WebSocket
 * No auth required — public market data only
 */

import type { Ticker } from '@coin/types';

type TickerCallback = (ticker: Ticker) => void;

function getNativeWebSocket(): typeof WebSocket | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.__nativeWebSocket || window.WebSocket;
}

const BINANCE_SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'dogeusdt', 'xrpusdt', 'adausdt'];

function connectBinance(onTicker: TickerCallback): WebSocket | null {
  const NativeWebSocket = getNativeWebSocket();
  if (!NativeWebSocket) return null;

  try {
    const streams = BINANCE_SYMBOLS.map((s) => `${s}@ticker`).join('/');
    const ws = new NativeWebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onmessage = (event) => {
      try {
        const { data } = JSON.parse(event.data as string);
        if (!data || !data.s) return;

        onTicker({
          exchange: 'binance',
          symbol: data.s,
          price: data.c,
          volume24h: data.v,
          change24h: data.p,
          changePercent24h: parseFloat(data.P).toFixed(2),
          high24h: data.h,
          low24h: data.l,
          timestamp: data.E || Date.now(),
        });
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      console.warn('[demo-ws] Binance WebSocket error');
    };

    return ws;
  } catch {
    console.warn('[demo-ws] Failed to connect Binance WebSocket');
    return null;
  }
}

export function connectDemoExchanges(onTicker: TickerCallback): () => void {
  const sockets: (WebSocket | null)[] = [];

  sockets.push(connectBinance(onTicker));

  return () => {
    sockets.forEach((ws) => ws?.close());
  };
}

export async function fetchBinanceCandles(
  symbol: string,
  interval: string,
  limit = 200,
): Promise<
  Array<{
    timestamp: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>
> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch Binance candles');
  const data = await res.json();
  return data.map((c: unknown[]) => ({
    timestamp: c[0] as number,
    open: String(c[1]),
    high: String(c[2]),
    low: String(c[3]),
    close: String(c[4]),
    volume: String(c[5]),
  }));
}
