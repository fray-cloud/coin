import WebSocket from 'ws';
import { ExchangeId, Ticker } from '@coin/types';
import { IExchangeWebSocket, WebSocketEventHandler } from '../interfaces/exchange-ws';

export class BybitWebSocket implements IExchangeWebSocket {
  readonly exchangeId: ExchangeId = 'bybit';
  private ws: WebSocket | null = null;
  private tickerCallback: ((ticker: Ticker) => void) | null = null;
  private symbols: string[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private handlers: WebSocketEventHandler;

  private static readonly WS_URL = 'wss://stream.bybit.com/v5/public/spot';

  constructor(handlers: WebSocketEventHandler = {}) {
    this.handlers = handlers;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(BybitWebSocket.WS_URL);

    this.ws.on('open', () => {
      this.handlers.onConnected?.();
      this.startPing();
      if (this.symbols.length > 0) {
        this.sendSubscription();
      }
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.topic?.startsWith('tickers.') && parsed.data && this.tickerCallback) {
          this.tickerCallback(this.normalizeTicker(parsed.data, parsed.topic));
        }
      } catch {
        // ignore parse errors
      }
    });

    this.ws.on('close', () => {
      this.handlers.onDisconnected?.();
      this.stopPing();
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
    this.stopPing();
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
    if (this.isConnected()) {
      this.sendSubscription();
    }
  }

  private sendSubscription(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const args = this.symbols.map((s) => `tickers.${s}`);
    this.ws.send(JSON.stringify({ op: 'subscribe', args }));
  }

  private normalizeTicker(raw: Record<string, unknown>, topic: string): Ticker {
    const symbol = topic.replace('tickers.', '');

    const lastPrice = Number(raw.lastPrice);
    const prevPrice24h = Number(raw.prevPrice24h);
    const hasValidChange = Number.isFinite(lastPrice) && Number.isFinite(prevPrice24h);

    const price24hPcnt = Number(raw.price24hPcnt);
    const hasValidChangePercent = Number.isFinite(price24hPcnt);

    const rawTimestamp = typeof raw.ts === 'number' ? raw.ts : undefined;

    return {
      exchange: 'bybit',
      symbol,
      price: raw.lastPrice as string,
      volume24h: raw.volume24h as string,
      change24h: hasValidChange ? String(lastPrice - prevPrice24h) : '0',
      changePercent24h: hasValidChangePercent ? String(price24hPcnt * 100) : '0',
      high24h: raw.highPrice24h as string,
      low24h: raw.lowPrice24h as string,
      timestamp: rawTimestamp ?? Date.now(),
    };
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }
}
