/**
 * Demo mode: connect directly to exchange public WebSockets
 * No auth required — public market data only
 */

import type { Ticker } from '@coin/types';

type TickerCallback = (ticker: Ticker) => void;

// --- Upbit Public WebSocket ---

const UPBIT_WS_URL = 'wss://api.upbit.com/websocket/v1';
const UPBIT_SYMBOLS = [
  'KRW-BTC',
  'KRW-ETH',
  'KRW-XRP',
  'KRW-SOL',
  'KRW-DOGE',
  'KRW-ADA',
  'KRW-AVAX',
  'KRW-DOT',
];

function connectUpbit(onTicker: TickerCallback): WebSocket {
  const ws = new WebSocket(UPBIT_WS_URL);

  ws.onopen = () => {
    ws.send(JSON.stringify([{ ticket: 'demo-upbit' }, { type: 'ticker', codes: UPBIT_SYMBOLS }]));
  };

  ws.onmessage = async (event) => {
    try {
      const blob = event.data as Blob;
      const text = await blob.text();
      const data = JSON.parse(text);

      onTicker({
        exchange: 'upbit',
        symbol: data.code,
        price: String(data.trade_price),
        volume24h: String(data.acc_trade_volume_24h || '0'),
        change24h: String(data.signed_change_price || '0'),
        changePercent24h: String(((data.signed_change_rate || 0) * 100).toFixed(2)),
        high24h: String(data.high_price || '0'),
        low24h: String(data.low_price || '0'),
        timestamp: data.timestamp || Date.now(),
      });
    } catch {
      // ignore parse errors
    }
  };

  return ws;
}

// --- Binance Public WebSocket ---

const BINANCE_SYMBOLS = ['btcusdt', 'ethusdt', 'solusdt', 'dogeusdt', 'xrpusdt', 'adausdt'];

function connectBinance(onTicker: TickerCallback): WebSocket {
  const streams = BINANCE_SYMBOLS.map((s) => `${s}@ticker`).join('/');
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

  ws.onmessage = (event) => {
    try {
      const { data } = JSON.parse(event.data);
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

  return ws;
}

// --- Combined connection manager ---

export function connectDemoExchanges(onTicker: TickerCallback): () => void {
  const sockets: WebSocket[] = [];

  sockets.push(connectUpbit(onTicker));
  sockets.push(connectBinance(onTicker));

  return () => {
    sockets.forEach((ws) => ws.close());
  };
}

// --- Public REST APIs for candles ---

export async function fetchUpbitCandles(
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
  const minuteMap: Record<string, number> = {
    '1m': 1,
    '3m': 3,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
  };
  const minutes = minuteMap[interval] || 5;
  const url = `https://api.upbit.com/v1/candles/minutes/${minutes}?market=${encodeURIComponent(symbol)}&count=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch Upbit candles');
  const data = await res.json();
  return data
    .map((c: Record<string, unknown>) => ({
      timestamp: new Date(c.candle_date_time_utc as string).getTime(),
      open: String(c.opening_price),
      high: String(c.high_price),
      low: String(c.low_price),
      close: String(c.trade_price),
      volume: String(c.candle_acc_trade_volume),
    }))
    .reverse();
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
