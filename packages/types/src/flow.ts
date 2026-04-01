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

export interface ParamDefinition {
  key: string;
  required: boolean;
}

export interface NodeTypeInfo {
  subtype: string;
  type: FlowNodeDefinition['type'];
  label: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  defaultConfig: Record<string, unknown>;
  params?: ParamDefinition[];
}

/** Returns initial config for a new node: only required params from defaultConfig. */
export function getRequiredConfig(info: NodeTypeInfo): Record<string, unknown> {
  if (!info.params) return { ...info.defaultConfig };
  const requiredKeys = new Set(info.params.filter((p) => p.required).map((p) => p.key));
  return Object.fromEntries(
    Object.entries(info.defaultConfig).filter(([k]) => requiredKeys.has(k)),
  );
}

export const NODE_TYPE_REGISTRY: Record<string, NodeTypeInfo> = {
  'candle-stream': {
    subtype: 'candle-stream',
    type: 'data',
    label: '캔들 데이터',
    inputs: [],
    outputs: [{ name: 'candles', type: 'Candle[]' }],
    defaultConfig: {},
  },
  rsi: {
    subtype: 'rsi',
    type: 'indicator',
    label: 'RSI 지표',
    inputs: [{ name: 'candles', type: 'Candle[]', required: true }],
    outputs: [{ name: 'value', type: 'number' }],
    defaultConfig: { period: 14, source: 'close' },
    params: [
      { key: 'period', required: true },
      { key: 'source', required: false },
    ],
  },
  macd: {
    subtype: 'macd',
    type: 'indicator',
    label: 'MACD 지표',
    inputs: [{ name: 'candles', type: 'Candle[]', required: true }],
    outputs: [
      { name: 'macd', type: 'number' },
      { name: 'signal', type: 'number' },
      { name: 'histogram', type: 'number' },
    ],
    defaultConfig: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    params: [
      { key: 'fastPeriod', required: true },
      { key: 'slowPeriod', required: true },
      { key: 'signalPeriod', required: false },
    ],
  },
  bollinger: {
    subtype: 'bollinger',
    type: 'indicator',
    label: '볼린저 밴드',
    inputs: [{ name: 'candles', type: 'Candle[]', required: true }],
    outputs: [
      { name: 'upper', type: 'number' },
      { name: 'middle', type: 'number' },
      { name: 'lower', type: 'number' },
    ],
    defaultConfig: { period: 20, stdDev: 2 },
    params: [
      { key: 'period', required: true },
      { key: 'stdDev', required: false },
    ],
  },
  ema: {
    subtype: 'ema',
    type: 'indicator',
    label: 'EMA (지수이동평균)',
    inputs: [{ name: 'candles', type: 'Candle[]', required: true }],
    outputs: [{ name: 'value', type: 'number' }],
    defaultConfig: { period: 20 },
    params: [{ key: 'period', required: true }],
  },
  threshold: {
    subtype: 'threshold',
    type: 'condition',
    label: '기준값 조건',
    inputs: [{ name: 'value', type: 'number', required: true }],
    outputs: [{ name: 'result', type: 'boolean' }],
    defaultConfig: { operator: '<', threshold: 30 },
    params: [
      { key: 'operator', required: true },
      { key: 'threshold', required: true },
    ],
  },
  crossover: {
    subtype: 'crossover',
    type: 'condition',
    label: '크로스 조건',
    inputs: [
      { name: 'value_a', type: 'number', required: true },
      { name: 'value_b', type: 'number', required: true },
    ],
    outputs: [{ name: 'result', type: 'boolean' }],
    defaultConfig: { direction: 'above' },
    params: [{ key: 'direction', required: true }],
  },
  'and-or': {
    subtype: 'and-or',
    type: 'condition',
    label: 'AND / OR 조건',
    inputs: [
      { name: 'a', type: 'boolean', required: true },
      { name: 'b', type: 'boolean', required: true },
    ],
    outputs: [{ name: 'result', type: 'boolean' }],
    defaultConfig: { operator: 'AND' },
    params: [{ key: 'operator', required: true }],
  },
  'market-order': {
    subtype: 'market-order',
    type: 'order',
    label: '시장가 주문',
    inputs: [{ name: 'trigger', type: 'boolean', required: true }],
    outputs: [{ name: 'result', type: 'OrderResult' }],
    defaultConfig: { side: 'buy', amount: '0.001' },
    params: [
      { key: 'side', required: true },
      { key: 'amount', required: true },
    ],
  },
  alert: {
    subtype: 'alert',
    type: 'order',
    label: '알림',
    inputs: [{ name: 'trigger', type: 'boolean', required: true }],
    outputs: [],
    defaultConfig: { message: '신호 발생!' },
    params: [{ key: 'message', required: false }],
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
