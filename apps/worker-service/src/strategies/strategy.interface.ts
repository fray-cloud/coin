export type StrategySignal = 'buy' | 'sell' | 'hold';

export interface StrategyEvaluation {
  signal: StrategySignal;
  confidence: number;
  indicatorValues: Record<string, number | string>;
  reason: string;
}

export interface ITradingStrategy {
  readonly type: string;
  evaluate(closePrices: number[], config: Record<string, unknown>): StrategyEvaluation;
}
