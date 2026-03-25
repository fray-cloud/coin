import type { OrderRequest, OrderResult } from '@coin/types';

export interface OrderRequestedEvent {
  requestId: string;
  userId: string;
  exchangeKeyId: string;
  order: OrderRequest;
  mode: 'paper' | 'real';
  dbOrderId: string;
}

export interface OrderResultEvent {
  requestId: string;
  userId: string;
  dbOrderId: string;
  result: OrderResult;
  mode: 'paper' | 'real';
}

export interface StrategySignalEvent {
  strategyId: string;
  userId: string;
  exchange: string;
  symbol: string;
  signal: 'buy' | 'sell';
  strategyType: string;
  indicatorValues: Record<string, number | string>;
  reason: string;
  timestamp: number;
}

export interface NotificationEvent {
  userId: string;
  type: 'order_filled' | 'order_failed' | 'strategy_signal' | 'risk_blocked';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
