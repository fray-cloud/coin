import { MACD } from 'technicalindicators';
import type { ITradingStrategy, StrategyEvaluation } from '../strategy.interface';

export class MacdStrategy implements ITradingStrategy {
  readonly type = 'macd';

  evaluate(closePrices: number[], config: Record<string, unknown>): StrategyEvaluation {
    const fastPeriod = (config.fastPeriod as number) || 12;
    const slowPeriod = (config.slowPeriod as number) || 26;
    const signalPeriod = (config.signalPeriod as number) || 9;
    const minDataPoints = slowPeriod + signalPeriod;

    if (closePrices.length < minDataPoints) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: `Not enough data: need ${minDataPoints}, got ${closePrices.length}`,
      };
    }

    const macdValues = MACD.calculate({
      values: closePrices,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });

    if (macdValues.length < 2) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: 'Not enough MACD data points for crossover detection',
      };
    }

    const current = macdValues[macdValues.length - 1];
    const previous = macdValues[macdValues.length - 2];

    if (
      current.MACD == null ||
      current.signal == null ||
      previous.MACD == null ||
      previous.signal == null
    ) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: 'MACD values not available',
      };
    }

    const indicators = {
      macd: Math.round(current.MACD * 100) / 100,
      signal: Math.round(current.signal * 100) / 100,
      histogram: Math.round((current.histogram ?? 0) * 100) / 100,
    };

    // Bullish crossover: MACD crosses above signal
    if (previous.MACD <= previous.signal && current.MACD > current.signal) {
      return {
        signal: 'buy',
        confidence: Math.min(Math.abs(current.MACD - current.signal) / Math.abs(current.MACD), 1),
        indicatorValues: indicators,
        reason: `MACD bullish crossover: MACD ${current.MACD.toFixed(2)} > Signal ${current.signal.toFixed(2)}`,
      };
    }

    // Bearish crossover: MACD crosses below signal
    if (previous.MACD >= previous.signal && current.MACD < current.signal) {
      return {
        signal: 'sell',
        confidence: Math.min(Math.abs(current.signal - current.MACD) / Math.abs(current.signal), 1),
        indicatorValues: indicators,
        reason: `MACD bearish crossover: MACD ${current.MACD.toFixed(2)} < Signal ${current.signal.toFixed(2)}`,
      };
    }

    return {
      signal: 'hold',
      confidence: 0,
      indicatorValues: indicators,
      reason: `MACD no crossover: MACD ${current.MACD.toFixed(2)}, Signal ${current.signal.toFixed(2)}`,
    };
  }
}
