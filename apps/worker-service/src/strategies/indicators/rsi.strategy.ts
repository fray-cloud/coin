import { RSI } from 'technicalindicators';
import type { ITradingStrategy, StrategyEvaluation } from '../strategy.interface';

export class RsiStrategy implements ITradingStrategy {
  readonly type = 'rsi';

  evaluate(closePrices: number[], config: Record<string, unknown>): StrategyEvaluation {
    const period = (config.period as number) || 14;
    const overbought = (config.overbought as number) || 70;
    const oversold = (config.oversold as number) || 30;

    if (closePrices.length < period + 1) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: `Not enough data: need ${period + 1}, got ${closePrices.length}`,
      };
    }

    const rsiValues = RSI.calculate({ values: closePrices, period });
    const currentRsi = rsiValues[rsiValues.length - 1];

    if (currentRsi <= oversold) {
      return {
        signal: 'buy',
        confidence: (oversold - currentRsi) / oversold,
        indicatorValues: { rsi: Math.round(currentRsi * 100) / 100 },
        reason: `RSI ${currentRsi.toFixed(2)} <= oversold ${oversold}`,
      };
    }

    if (currentRsi >= overbought) {
      return {
        signal: 'sell',
        confidence: (currentRsi - overbought) / (100 - overbought),
        indicatorValues: { rsi: Math.round(currentRsi * 100) / 100 },
        reason: `RSI ${currentRsi.toFixed(2)} >= overbought ${overbought}`,
      };
    }

    return {
      signal: 'hold',
      confidence: 0,
      indicatorValues: { rsi: Math.round(currentRsi * 100) / 100 },
      reason: `RSI ${currentRsi.toFixed(2)} is neutral (${oversold}-${overbought})`,
    };
  }
}
