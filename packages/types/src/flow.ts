export type PortType =
  | 'Candle[]'
  | 'OrderBookLevel[]'
  | 'number'
  | 'boolean'
  | 'boolean[]'
  | 'OrderResult';

export interface FlowNodeDefinition {
  id: string;
  type: 'data' | 'indicator' | 'condition' | 'order' | 'flow-control';
  subtype: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface FlowEdgeDefinition {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface FlowDefinition {
  nodes: FlowNodeDefinition[];
  edges: FlowEdgeDefinition[];
}

export interface PortDefinition {
  name: string;
  type: PortType;
  required?: boolean;
}

export interface NodeTypeInfo {
  subtype: string;
  type: FlowNodeDefinition['type'];
  label: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  defaultConfig: Record<string, unknown>;
}

export const NODE_TYPE_REGISTRY: Record<string, NodeTypeInfo> = {
  'candle-stream': {
    subtype: 'candle-stream',
    type: 'data',
    label: 'Candle Stream',
    inputs: [],
    outputs: [{ name: 'candles', type: 'Candle[]' }],
    defaultConfig: {},
  },
  rsi: {
    subtype: 'rsi',
    type: 'indicator',
    label: 'RSI',
    inputs: [{ name: 'candles', type: 'Candle[]', required: true }],
    outputs: [{ name: 'value', type: 'number' }],
    defaultConfig: { period: 14, source: 'close' },
  },
  macd: {
    subtype: 'macd',
    type: 'indicator',
    label: 'MACD',
    inputs: [{ name: 'candles', type: 'Candle[]', required: true }],
    outputs: [
      { name: 'macd', type: 'number' },
      { name: 'signal', type: 'number' },
      { name: 'histogram', type: 'number' },
    ],
    defaultConfig: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  },
  bollinger: {
    subtype: 'bollinger',
    type: 'indicator',
    label: 'Bollinger Bands',
    inputs: [{ name: 'candles', type: 'Candle[]', required: true }],
    outputs: [
      { name: 'upper', type: 'number' },
      { name: 'middle', type: 'number' },
      { name: 'lower', type: 'number' },
    ],
    defaultConfig: { period: 20, stdDev: 2 },
  },
  ema: {
    subtype: 'ema',
    type: 'indicator',
    label: 'EMA',
    inputs: [{ name: 'candles', type: 'Candle[]', required: true }],
    outputs: [{ name: 'value', type: 'number' }],
    defaultConfig: { period: 20 },
  },
  threshold: {
    subtype: 'threshold',
    type: 'condition',
    label: 'Threshold',
    inputs: [{ name: 'value', type: 'number', required: true }],
    outputs: [{ name: 'result', type: 'boolean' }],
    defaultConfig: { operator: '<', threshold: 30 },
  },
  crossover: {
    subtype: 'crossover',
    type: 'condition',
    label: 'Crossover',
    inputs: [
      { name: 'value_a', type: 'number', required: true },
      { name: 'value_b', type: 'number', required: true },
    ],
    outputs: [{ name: 'result', type: 'boolean' }],
    defaultConfig: { direction: 'above' },
  },
  'and-or': {
    subtype: 'and-or',
    type: 'condition',
    label: 'AND / OR',
    inputs: [
      { name: 'a', type: 'boolean', required: true },
      { name: 'b', type: 'boolean', required: true },
    ],
    outputs: [{ name: 'result', type: 'boolean' }],
    defaultConfig: { operator: 'AND' },
  },
  'market-order': {
    subtype: 'market-order',
    type: 'order',
    label: 'Market Order',
    inputs: [{ name: 'trigger', type: 'boolean', required: true }],
    outputs: [{ name: 'result', type: 'OrderResult' }],
    defaultConfig: { side: 'buy', amount: '0.001' },
  },
  alert: {
    subtype: 'alert',
    type: 'order',
    label: 'Alert',
    inputs: [{ name: 'trigger', type: 'boolean', required: true }],
    outputs: [],
    defaultConfig: { message: 'Signal triggered!' },
  },
};

export interface FlowExecutionTraceEntry {
  timestamp: string;
  nodeId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  fired: boolean;
  durationMs: number;
}

export interface FlowExecutionResult {
  traces: FlowExecutionTraceEntry[];
  actions: FlowOrderAction[];
}

export interface FlowOrderAction {
  nodeId: string;
  side: 'buy' | 'sell';
  amount: string;
  type: 'market' | 'limit';
  price?: string;
}

export interface BacktestSummary {
  totalCandles: number;
  totalSignals: number;
  buySignals: number;
  sellSignals: number;
  totalTrades: number;
  winRate: number;
  realizedPnl: number;
  dailyPnl: Array<{ date: string; pnl: number }>;
}

export const FLOW_LIMITS = {
  MAX_NODES: 50,
  MAX_EDGES: 100,
  MAX_BACKTEST_DAYS: 90,
  MAX_BACKTESTS_PER_FLOW: 5,
} as const;
