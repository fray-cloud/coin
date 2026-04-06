export interface OhlcvCandle {
  timestamp: number; // Unix milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestConfig {
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  exchange: string;
  symbol: string;
  interval: string;
  startTime: number; // Unix ms
  endTime: number; // Unix ms
  initialCapital: number;
  /** Fraction of capital to allocate per trade (0–1). Default: 1.0 = 100% */
  positionSizeFraction?: number;
  /** Fee rate per side (e.g. 0.001 = 0.1%). Default: 0.001 */
  feeRate?: number;
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  fee: number;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
}

export interface BacktestMetrics {
  totalReturnPct: number;
  annualizedReturnPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinPct: number;
  avgLossPct: number;
  avgHoldingMs: number;
  finalEquity: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  metrics: BacktestMetrics;
  trades: Trade[];
  equityCurve: EquityPoint[];
}

export type OptimizeTarget = 'sharpeRatio' | 'totalReturnPct' | 'profitFactor' | 'winRate';

export interface OptimizationConfig {
  strategyType: string;
  strategyConfig?: Record<string, unknown>;
  exchange: string;
  symbol: string;
  interval: string;
  startTime: number;
  endTime: number;
  initialCapital: number;
  feeRate?: number;
  /** Maps each param name to an array of candidate values */
  parameterGrid: Record<string, number[]>;
  optimizeFor: OptimizeTarget;
}

export interface OptimizationResult {
  bestParams: Record<string, unknown>;
  bestMetrics: BacktestMetrics;
  allResults: Array<{
    params: Record<string, unknown>;
    metrics: BacktestMetrics;
  }>;
}

export interface WalkForwardConfig {
  strategyType: string;
  exchange: string;
  symbol: string;
  interval: string;
  startTime: number;
  endTime: number;
  initialCapital: number;
  feeRate?: number;
  parameterGrid: Record<string, number[]>;
  /** Number of walk-forward windows (default: 5) */
  numWindows?: number;
  /** Fraction of each window used for training (default: 0.7) */
  trainFraction?: number;
  optimizeFor: OptimizeTarget;
}

export interface WalkForwardWindow {
  windowIndex: number;
  trainStart: number;
  trainEnd: number;
  testStart: number;
  testEnd: number;
  bestParams: Record<string, unknown>;
  trainMetrics: BacktestMetrics;
  testMetrics: BacktestMetrics;
}

export interface WalkForwardResult {
  windows: WalkForwardWindow[];
  /** Aggregate metrics across all out-of-sample test periods */
  combinedTestMetrics: BacktestMetrics;
}

export interface MonteCarloConfig {
  trades: Trade[];
  initialCapital: number;
  /** Number of Monte Carlo paths (default: 1000) */
  numSimulations?: number;
  /** e.g. 0.95 for 5th/95th percentile reporting */
  confidenceLevel?: number;
}

export interface MonteCarloResult {
  numSimulations: number;
  /** Final equity at each percentile { "5": 950, "50": 1200, "95": 1800 } */
  finalEquityPercentiles: Record<string, number>;
  /** Max drawdown at each percentile */
  maxDrawdownPercentiles: Record<string, number>;
  /** Probability of ending with less than 50% of initial capital */
  ruinProbability: number;
  medianFinalEquity: number;
  medianMaxDrawdown: number;
}
