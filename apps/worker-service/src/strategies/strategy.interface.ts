export type StrategySignal = 'buy' | 'sell' | 'hold';

export interface StrategyEvaluation {
  signal: StrategySignal;
  confidence: number;
  indicatorValues: Record<string, number | string>;
  reason: string;
}

export interface CandleOHLCV {
  open?: number[];
  high: number[];
  low: number[];
  close: number[];
  volume?: number[];
}

export interface MultiTimeframeData {
  htf1?: { close: number[] };
  htf2?: { close: number[] };
}

export interface ITradingStrategy {
  readonly type: string;
  evaluate(
    closePrices: number[],
    config: Record<string, unknown>,
    candles?: CandleOHLCV,
    multiTimeframe?: MultiTimeframeData,
  ): StrategyEvaluation;
}
