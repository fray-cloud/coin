import type { ActivityItem } from '@/lib/api-client';

export const demoActivity: ActivityItem[] = [
  {
    id: 'act-001',
    type: 'order',
    title: 'BTC 매수 체결',
    description: 'BTCUSDT 0.005 BTC @ $95,000 체결',
    exchange: 'binance',
    symbol: 'BTCUSDT',
    status: 'filled',
    side: 'buy',
    createdAt: '2026-04-06T09:30:00.000Z',
  },
  {
    id: 'act-002',
    type: 'order',
    title: 'BTC 매도 체결',
    description: 'BTCUSDT 0.01 BTC @ $95,500 체결',
    exchange: 'binance',
    symbol: 'BTCUSDT',
    status: 'filled',
    side: 'sell',
    createdAt: '2026-04-05T10:15:00.000Z',
  },
];
