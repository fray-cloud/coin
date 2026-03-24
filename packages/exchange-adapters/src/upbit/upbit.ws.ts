import WebSocket from 'ws';
import { ExchangeId, Ticker } from '@coin/types';
import { IExchangeWebSocket, WebSocketEventHandler } from '../interfaces/exchange-ws';

export class UpbitWebSocket implements IExchangeWebSocket {
  readonly exchangeId: ExchangeId = 'upbit';
  private ws: WebSocket | null = null;
  private tickerCallback: ((ticker: Ticker) => void) | null = null;
  private symbols: string[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: WebSocketEventHandler;

  private static readonly WS_URL = 'wss://api.upbit.com/websocket/v1';

  constructor(handlers: WebSocketEventHandler = {}) {
    this.handlers = handlers;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(UpbitWebSocket.WS_URL);

    this.ws.on('open', () => {
      this.handlers.onConnected?.();
      if (this.symbols.length > 0) {
        this.sendSubscription();
      }
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'ticker' && this.tickerCallback) {
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
    if (this.isConnected()) {
      this.sendSubscription();
    }
  }

  private sendSubscription(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    // Upbit symbols: KRW-BTC 형식
    const payload = JSON.stringify([
      { ticket: `upbit-ticker-${Date.now()}` },
      { type: 'ticker', codes: this.symbols },
    ]);
    this.ws.send(payload);
  }

  private normalizeTicker(raw: Record<string, unknown>): Ticker {
    return {
      exchange: 'upbit',
      symbol: raw.code as string,
      price: String(raw.trade_price),
      volume24h: String(raw.acc_trade_volume_24h),
      change24h: String(raw.signed_change_price),
      changePercent24h: String(Number(raw.signed_change_rate) * 100),
      high24h: String(raw.high_price),
      low24h: String(raw.low_price),
      timestamp: raw.timestamp as number,
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
