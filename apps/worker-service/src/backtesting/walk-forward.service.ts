import { Injectable, Logger } from '@nestjs/common';
import { OptimizerService } from './optimizer.service';
import { calculateMetrics } from './metrics.calculator';
import { runBacktest } from './backtest-engine';
import { RsiStrategy } from '../strategies/indicators/rsi.strategy';
import { MacdStrategy } from '../strategies/indicators/macd.strategy';
import { BollingerStrategy } from '../strategies/indicators/bollinger.strategy';
import type { ITradingStrategy } from '../strategies/strategy.interface';
import type {
  OhlcvCandle,
  WalkForwardConfig,
  WalkForwardResult,
  WalkForwardWindow,
  Trade,
  EquityPoint,
} from './backtesting.types';

const STRATEGY_MAP: Record<string, () => ITradingStrategy> = {
  rsi: () => new RsiStrategy(),
  macd: () => new MacdStrategy(),
  bollinger: () => new BollingerStrategy(),
};

@Injectable()
export class WalkForwardService {
  private readonly logger = new Logger(WalkForwardService.name);

  constructor(private readonly optimizer: OptimizerService) {}

  /**
   * Performs walk-forward analysis:
   * - Divides [startTime, endTime] into `numWindows` rolling windows.
   * - For each window, optimizes on the training segment, then tests on the hold-out segment.
   * - Returns per-window results and aggregated out-of-sample metrics.
   */
  analyze(candles: OhlcvCandle[], config: WalkForwardConfig): WalkForwardResult {
    const numWindows = config.numWindows ?? 5;
    const trainFraction = config.trainFraction ?? 0.7;
    const feeRate = config.feeRate ?? 0.001;

    const sorted = [...candles].sort((a, b) => a.timestamp - b.timestamp);
    if (sorted.length < numWindows * 10) {
      throw new Error(
        `Insufficient candles (${sorted.length}) for ${numWindows} walk-forward windows`,
      );
    }

    const totalMs = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    const windowMs = totalMs / numWindows;
    const startTs = sorted[0].timestamp;

    const windows: WalkForwardWindow[] = [];
    const allTestTrades: Trade[] = [];
    const allTestEquity: EquityPoint[] = [];
    let testCapital = config.initialCapital;

    for (let w = 0; w < numWindows; w++) {
      const windowStart = startTs + w * windowMs;
      const windowEnd = windowStart + windowMs;
      const trainEnd = windowStart + windowMs * trainFraction;

      const trainCandles = sorted.filter(
        (c) => c.timestamp >= windowStart && c.timestamp < trainEnd,
      );
      const testCandles = sorted.filter((c) => c.timestamp >= trainEnd && c.timestamp < windowEnd);

      if (trainCandles.length < 2 || testCandles.length < 2) {
        this.logger.warn(`Window ${w}: insufficient candles, skipping`);
        continue;
      }

      // Optimize on training segment
      const optResult = this.optimizer.optimize(trainCandles, {
        strategyType: config.strategyType,
        exchange: config.exchange,
        symbol: config.symbol,
        interval: config.interval,
        startTime: windowStart,
        endTime: trainEnd,
        initialCapital: config.initialCapital,
        feeRate,
        parameterGrid: config.parameterGrid,
        optimizeFor: config.optimizeFor,
      });

      // Run training backtest with best params (for reporting)
      const strategy = STRATEGY_MAP[config.strategyType]?.();
      if (!strategy) throw new Error(`Unknown strategy: ${config.strategyType}`);

      const trainResult = runBacktest(trainCandles, strategy, {
        strategyType: config.strategyType,
        strategyConfig: optResult.bestParams,
        exchange: config.exchange,
        symbol: config.symbol,
        interval: config.interval,
        startTime: windowStart,
        endTime: trainEnd,
        initialCapital: config.initialCapital,
        feeRate,
      });

      // Test on out-of-sample segment (capital carries forward between windows)
      const testResult = runBacktest(testCandles, strategy, {
        strategyType: config.strategyType,
        strategyConfig: optResult.bestParams,
        exchange: config.exchange,
        symbol: config.symbol,
        interval: config.interval,
        startTime: trainEnd,
        endTime: windowEnd,
        initialCapital: testCapital,
        feeRate,
      });

      // Carry capital forward
      testCapital = testResult.metrics.finalEquity;

      // Accumulate test equity (offset by window)
      for (const t of testResult.trades) allTestTrades.push(t);
      for (const pt of testResult.equityCurve) allTestEquity.push(pt);

      windows.push({
        windowIndex: w,
        trainStart: windowStart,
        trainEnd,
        testStart: trainEnd,
        testEnd: windowEnd,
        bestParams: optResult.bestParams,
        trainMetrics: trainResult.metrics,
        testMetrics: testResult.metrics,
      });

      this.logger.debug(
        `Window ${w}: train Sharpe=${trainResult.metrics.sharpeRatio}, test Sharpe=${testResult.metrics.sharpeRatio}`,
      );
    }

    const combinedTestMetrics = calculateMetrics(
      allTestTrades,
      allTestEquity,
      config.initialCapital,
      config.startTime,
      config.endTime,
    );

    return { windows, combinedTestMetrics };
  }
}
