export interface MockStrategy {
  id: string;
  userId: string;
  name: string;
  type: string;
  exchange: string;
  symbol: string;
  mode: string;
  tradingMode: string;
  exchangeKeyId: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  riskConfig: Record<string, unknown>;
  intervalSeconds: number;
  candleInterval: string;
  createdAt: Date;
  updatedAt: Date;
}

let strategyCounter = 0;

export function createMockStrategy(overrides: Partial<MockStrategy> = {}): MockStrategy {
  strategyCounter++;
  return {
    id: `strategy-${strategyCounter}`,
    userId: 'user-1',
    name: `Test Strategy ${strategyCounter}`,
    type: 'rsi',
    exchange: 'upbit',
    symbol: 'KRW-BTC',
    mode: 'signal',
    tradingMode: 'paper',
    exchangeKeyId: null,
    enabled: false,
    config: { period: 14, overbought: 70, oversold: 30 },
    riskConfig: {},
    intervalSeconds: 60,
    candleInterval: '1h',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

export function resetStrategyCounter() {
  strategyCounter = 0;
}
