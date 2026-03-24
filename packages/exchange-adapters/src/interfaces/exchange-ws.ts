import { ExchangeId, Ticker } from '@coin/types';

export interface IExchangeWebSocket {
  readonly exchangeId: ExchangeId;
  connect(): void;
  disconnect(): void;
  isConnected(): boolean;
  subscribeTicker(symbols: string[], callback: (ticker: Ticker) => void): void;
}

export type WebSocketEventHandler = {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
};
