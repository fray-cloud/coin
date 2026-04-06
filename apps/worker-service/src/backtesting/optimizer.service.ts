import { Injectable, Logger } from '@nestjs/common';
import { RsiStrategy } from '../strategies/indicators/rsi.strategy';
import { MacdStrategy } from '../strategies/indicators/macd.strategy';
import { BollingerStrategy } from '../strategies/indicators/bollinger.strategy';
import type { ITradingStrategy } from '../strategies/strategy.interface';
import { runBacktest } from './backtest-engine';
import type {
  OhlcvCandle,
  OptimizationConfig,
  OptimizationResult,
  BacktestMetrics,
  OptimizeTarget,
} from './backtesting.types';

const STRATEGY_MAP: Record<string, () => ITradingStrategy> = {
  rsi: () => new RsiStrategy(),
  macd: () => new MacdStrategy(),
  bollinger: () => new BollingerStrategy(),
};

@Injectable()
export class OptimizerService {
  private readonly logger = new Logger(OptimizerService.name);

  /**
   * Grid-searches over all combinations in parameterGrid, runs a backtest for each,
   * and returns the best parameter set sorted by optimizeFor metric.
   */
  optimize(candles: OhlcvCandle[], config: OptimizationConfig): OptimizationResult {
    const strategy = STRATEGY_MAP[config.strategyType]?.();
    if (!strategy) {
      throw new Error(`Unknown strategy type: ${config.strategyType}`);
    }

    const paramCombinations = this.buildGrid(config.parameterGrid);
    this.logger.debug(
      `Running grid search: ${paramCombinations.length} combinations for ${config.strategyType}`,
    );

    const allResults: Array<{ params: Record<string, unknown>; metrics: BacktestMetrics }> = [];

    for (const params of paramCombinations) {
      const result = runBacktest(candles, strategy, {
        strategyType: config.strategyType,
        strategyConfig: { ...(config.strategyConfig ?? {}), ...params },
        exchange: config.exchange,
        symbol: config.symbol,
        interval: config.interval,
        startTime: config.startTime,
        endTime: config.endTime,
        initialCapital: config.initialCapital,
        feeRate: config.feeRate,
      });
      allResults.push({ params, metrics: result.metrics });
    }

    allResults.sort(
      (a, b) =>
        this.metricValue(b.metrics, config.optimizeFor) -
        this.metricValue(a.metrics, config.optimizeFor),
    );

    const best = allResults[0];
    this.logger.debug(
      `Best params: ${JSON.stringify(best.params)} → ${config.optimizeFor}=${this.metricValue(best.metrics, config.optimizeFor)}`,
    );

    return {
      bestParams: best.params,
      bestMetrics: best.metrics,
      allResults,
    };
  }

  /**
   * Cartesian product of all parameter arrays.
   */
  private buildGrid(grid: Record<string, number[]>): Array<Record<string, number>> {
    const keys = Object.keys(grid);
    if (keys.length === 0) return [{}];

    let combinations: Array<Record<string, number>> = [{}];
    for (const key of keys) {
      const values = grid[key];
      const next: Array<Record<string, number>> = [];
      for (const existing of combinations) {
        for (const value of values) {
          next.push({ ...existing, [key]: value });
        }
      }
      combinations = next;
    }
    return combinations;
  }

  private metricValue(metrics: BacktestMetrics, target: OptimizeTarget): number {
    switch (target) {
      case 'sharpeRatio':
        return isFinite(metrics.sharpeRatio) ? metrics.sharpeRatio : 0;
      case 'totalReturnPct':
        return metrics.totalReturnPct;
      case 'profitFactor':
        return isFinite(metrics.profitFactor) ? metrics.profitFactor : 0;
      case 'winRate':
        return metrics.winRate;
    }
  }
}
