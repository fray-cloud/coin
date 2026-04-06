import type { FlowItem } from '@/lib/api-client';
import type { FlowDefinition } from '@coin/types';

const rsiFlowDefinition: FlowDefinition = {
  nodes: [
    { id: 'n1', type: 'data', subtype: 'candle-stream', position: { x: 100, y: 200 }, config: {} },
    {
      id: 'n2',
      type: 'indicator',
      subtype: 'rsi',
      position: { x: 350, y: 200 },
      config: { period: 14 },
    },
    {
      id: 'n3',
      type: 'condition',
      subtype: 'threshold',
      position: { x: 600, y: 150 },
      config: { operator: '<', threshold: 30 },
    },
    {
      id: 'n4',
      type: 'condition',
      subtype: 'threshold',
      position: { x: 600, y: 300 },
      config: { operator: '>', threshold: 70 },
    },
    {
      id: 'n5',
      type: 'order',
      subtype: 'market-order',
      position: { x: 850, y: 150 },
      config: { side: 'buy', amount: '0.001' },
    },
    {
      id: 'n6',
      type: 'order',
      subtype: 'market-order',
      position: { x: 850, y: 300 },
      config: { side: 'sell', amount: '0.001' },
    },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'candles', targetHandle: 'candles' },
    { id: 'e2', source: 'n2', target: 'n3', sourceHandle: 'value', targetHandle: 'value' },
    { id: 'e3', source: 'n2', target: 'n4', sourceHandle: 'value', targetHandle: 'value' },
    { id: 'e4', source: 'n3', target: 'n5', sourceHandle: 'result', targetHandle: 'trigger' },
    { id: 'e5', source: 'n4', target: 'n6', sourceHandle: 'result', targetHandle: 'trigger' },
  ],
};

export const demoFlows: FlowItem[] = [
  {
    id: 'flow-001',
    name: 'BTC RSI 자동매매',
    description: 'RSI가 30 이하면 매수, 70 이상이면 매도하는 기본 전략',
    definition: rsiFlowDefinition,
    exchange: 'upbit',
    symbol: 'KRW-BTC',
    candleInterval: '5m',
    enabled: false,
    tradingMode: 'paper',
    riskConfig: { maxPositionSize: 0.01, stopLoss: 3 },
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-04-05T00:00:00.000Z',
    backtests: [
      {
        id: 'bt-001',
        status: 'completed',
        summary: {
          totalCandles: 2880,
          totalSignals: 18,
          buySignals: 10,
          sellSignals: 8,
          totalTrades: 8,
          winRate: 62.5,
          realizedPnl: 1250000,
          dailyPnl: [
            { date: '2026-03-25', pnl: 120000 },
            { date: '2026-03-26', pnl: 250000 },
            { date: '2026-03-27', pnl: -80000 },
            { date: '2026-03-28', pnl: 310000 },
            { date: '2026-03-29', pnl: 180000 },
          ],
        },
        createdAt: '2026-04-01T00:00:00.000Z',
      },
    ],
  },
];
