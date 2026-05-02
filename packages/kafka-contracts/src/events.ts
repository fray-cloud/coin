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

export interface OrderCloseRequestedEvent {
  requestId: string;
  userId: string;
  dbOrderId: string;
}

export interface NotificationEvent {
  userId: string;
  type: 'order_filled' | 'order_failed';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
