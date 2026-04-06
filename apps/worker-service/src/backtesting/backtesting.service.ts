import { Injectable, Logger } from '@nestjs/common';
import { RsiStrategy } from '../strategies/indicators/rsi.strategy';
import { MacdStrategy } from '../strategies/indicators/macd.strategy';
import { BollingerStrategy } from '../strategies/indicators/bollinger.strategy';
import type { ITradingStrategy } from '../strategies/strategy.interface';
import { runBacktest } from './backtest-engine';
import { DataService } from './data.service';
import { OptimizerService } from './optimizer.service';
import { WalkForwardService } from './walk-forward.service';
import { MonteCarloService } from './monte-carlo.service';
import type {
  BacktestConfig,
  BacktestResult,
  OptimizationConfig,
  OptimizationResult,
  WalkForwardConfig,
  WalkForwardResult,
  MonteCarloConfig,
  MonteCarloResult,
} from './backtesting.types';

const STRATEGY_MAP: Record<string, () => ITradingStrategy> = {
  rsi: () => new RsiStrategy(),
  macd: () => new MacdStrategy(),
  bollinger: () => new BollingerStrategy(),
};

@Injectable()
export class BacktestingService {
  private readonly logger = new Logger(BacktestingService.name);

  constructor(
    private readonly dataService: DataService,
    private readonly optimizer: OptimizerService,
    private readonly walkForward: WalkForwardService,
    private readonly monteCarlo: MonteCarloService,
  ) {}

  /**
   * Runs a single strategy backtest over the given time range.
   */
  async backtest(config: BacktestConfig): Promise<BacktestResult> {
    const strategy = this.resolveStrategy(config.strategyType);
    const candles = await this.dataService.getCandles(
      config.exchange,
      config.symbol,
      config.interval,
      config.startTime,
      config.endTime,
    );

    if (candles.length < 2) {
      throw new Error(
        `Insufficient historical data for ${config.exchange}:${config.symbol}:${config.interval}`,
      );
    }

    this.logger.log(
      `Backtesting ${config.strategyType} on ${config.exchange}:${config.symbol}:${config.interval} ` +
        `with ${candles.length} candles`,
    );

    return runBacktest(candles, strategy, config);
  }

  /**
   * Grid-searches parameter space to find optimal strategy configuration.
   */
  async optimizeParams(config: OptimizationConfig): Promise<OptimizationResult> {
    const candles = await this.dataService.getCandles(
      config.exchange,
      config.symbol,
      config.interval,
      config.startTime,
      config.endTime,
    );

    if (candles.length < 2) {
      throw new Error(`Insufficient historical data for optimization`);
    }

    this.logger.log(
      `Optimizing ${config.strategyType} on ${candles.length} candles, ` +
        `grid size: ${this.gridSize(config.parameterGrid)} combinations`,
    );

    return this.optimizer.optimize(candles, config);
  }

  /**
   * Runs walk-forward analysis to validate strategy robustness out-of-sample.
   */
  async runWalkForward(config: WalkForwardConfig): Promise<WalkForwardResult> {
    const candles = await this.dataService.getCandles(
      config.exchange,
      config.symbol,
      config.interval,
      config.startTime,
      config.endTime,
    );

    if (candles.length < 2) {
      throw new Error(`Insufficient historical data for walk-forward analysis`);
    }

    this.logger.log(
      `Walk-forward analysis: ${config.strategyType}, ${config.numWindows ?? 5} windows, ` +
        `${candles.length} candles`,
    );

    return this.walkForward.analyze(candles, config);
  }

  /**
   * Runs Monte Carlo simulation on a set of historical trades.
   * Typically called after backtest() to stress-test the trade sequence.
   */
  runMonteCarlo(config: MonteCarloConfig): MonteCarloResult {
    this.logger.log(
      `Monte Carlo: ${config.numSimulations ?? 1000} simulations on ${config.trades.length} trades`,
    );
    return this.monteCarlo.simulate(config);
  }

  /**
   * Convenience: full analysis pipeline — backtest → optimize → walk-forward → Monte Carlo.
   */
  async fullAnalysis(
    backtestConfig: BacktestConfig,
    parameterGrid: Record<string, number[]>,
    optimizeFor: OptimizationConfig['optimizeFor'] = 'sharpeRatio',
    numSimulations = 1000,
  ): Promise<{
    backtest: BacktestResult;
    optimization: OptimizationResult;
    walkForward: WalkForwardResult;
    monteCarlo: MonteCarloResult;
  }> {
    const candles = await this.dataService.getCandles(
      backtestConfig.exchange,
      backtestConfig.symbol,
      backtestConfig.interval,
      backtestConfig.startTime,
      backtestConfig.endTime,
    );

    if (candles.length < 2) {
      throw new Error(`Insufficient historical data`);
    }

    const strategy = this.resolveStrategy(backtestConfig.strategyType);
    const backtest = runBacktest(candles, strategy, backtestConfig);

    const optimization = this.optimizer.optimize(candles, {
      strategyType: backtestConfig.strategyType,
      exchange: backtestConfig.exchange,
      symbol: backtestConfig.symbol,
      interval: backtestConfig.interval,
      startTime: backtestConfig.startTime,
      endTime: backtestConfig.endTime,
      initialCapital: backtestConfig.initialCapital,
      feeRate: backtestConfig.feeRate,
      parameterGrid,
      optimizeFor,
    });

    const walkForward = this.walkForward.analyze(candles, {
      strategyType: backtestConfig.strategyType,
      exchange: backtestConfig.exchange,
      symbol: backtestConfig.symbol,
      interval: backtestConfig.interval,
      startTime: backtestConfig.startTime,
      endTime: backtestConfig.endTime,
      initialCapital: backtestConfig.initialCapital,
      feeRate: backtestConfig.feeRate,
      parameterGrid,
      optimizeFor,
    });

    const monteCarlo = this.monteCarlo.simulate({
      trades: backtest.trades,
      initialCapital: backtestConfig.initialCapital,
      numSimulations,
    });

    return { backtest, optimization, walkForward, monteCarlo };
  }

  private resolveStrategy(type: string): ITradingStrategy {
    const factory = STRATEGY_MAP[type];
    if (!factory) throw new Error(`Unknown strategy type: ${type}`);
    return factory();
  }

  private gridSize(grid: Record<string, number[]>): number {
    return Object.values(grid).reduce((acc, arr) => acc * arr.length, 1);
  }
}
