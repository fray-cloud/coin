import WebSocket from 'ws';
import { ExchangeId, Ticker } from '@coin/types';
import { IExchangeWebSocket, WebSocketEventHandler } from '../interfaces/exchange-ws';

export class BinanceWebSocket implements IExchangeWebSocket {
  readonly exchangeId: ExchangeId = 'binance';
  private ws: WebSocket | null = null;
  private tickerCallback: ((ticker: Ticker) => void) | null = null;
  private symbols: string[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: WebSocketEventHandler;

  private static readonly WS_BASE = 'wss://stream.binance.com:9443/ws';

  constructor(handlers: WebSocketEventHandler = {}) {
    this.handlers = handlers;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.symbols.length === 0) return;

    // Binance: combined stream URL
    const streams = this.symbols
      .map((s) => `${s.toLowerCase()}@ticker`)
      .join('/');
    const url = `${BinanceWebSocket.WS_BASE}/${streams}`;

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.handlers.onConnected?.();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.e === '24hrTicker' && this.tickerCallback) {
          this.tickerCallback(this.normalizeTicker(parsed));
        }
      } catch {
        // ignore parse errors
      }
    });

    this.ws.on('close', () => {
      this.handlers.onDisconnected?.();
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      this.handlers.onError?.(err);
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  subscribeTicker(symbols: string[], callback: (ticker: Ticker) => void): void {
    this.symbols = symbols;
    this.tickerCallback = callback;
    // Binance requires reconnect to change streams
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
      this.ws = null;
    }
    this.connect();
  }

  private normalizeTicker(raw: Record<string, unknown>): Ticker {
    return {
      exchange: 'binance',
      symbol: raw.s as string,
      price: raw.c as string,
      volume24h: raw.v as string,
      change24h: raw.p as string,
      changePercent24h: raw.P as string,
      high24h: raw.h as string,
      low24h: raw.l as string,
      timestamp: raw.E as number,
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }
}
