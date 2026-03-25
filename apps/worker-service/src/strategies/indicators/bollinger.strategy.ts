import { BollingerBands } from 'technicalindicators';
import type { ITradingStrategy, StrategyEvaluation } from '../strategy.interface';

export class BollingerStrategy implements ITradingStrategy {
  readonly type = 'bollinger';

  evaluate(closePrices: number[], config: Record<string, unknown>): StrategyEvaluation {
    const period = (config.period as number) || 20;
    const stdDev = (config.stdDev as number) || 2;

    if (closePrices.length < period) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: `Not enough data: need ${period}, got ${closePrices.length}`,
      };
    }

    const bbValues = BollingerBands.calculate({
      values: closePrices,
      period,
      stdDev,
    });

    if (bbValues.length === 0) {
      return {
        signal: 'hold',
        confidence: 0,
        indicatorValues: {},
        reason: 'No Bollinger Band data available',
      };
    }

    const current = bbValues[bbValues.length - 1];
    const currentPrice = closePrices[closePrices.length - 1];
    const bandWidth = current.upper - current.lower;

    const indicators = {
      upper: Math.round(current.upper * 100) / 100,
      middle: Math.round(current.middle * 100) / 100,
      lower: Math.round(current.lower * 100) / 100,
      price: Math.round(currentPrice * 100) / 100,
    };

    // Price below lower band → buy (oversold bounce)
    if (currentPrice < current.lower) {
      return {
        signal: 'buy',
        confidence: Math.min((current.lower - currentPrice) / bandWidth, 1),
        indicatorValues: indicators,
        reason: `Price ${currentPrice.toFixed(2)} < Lower Band ${current.lower.toFixed(2)}`,
      };
    }

    // Price above upper band → sell (overbought reversal)
    if (currentPrice > current.upper) {
      return {
        signal: 'sell',
        confidence: Math.min((currentPrice - current.upper) / bandWidth, 1),
        indicatorValues: indicators,
        reason: `Price ${currentPrice.toFixed(2)} > Upper Band ${current.upper.toFixed(2)}`,
      };
    }

    return {
      signal: 'hold',
      confidence: 0,
      indicatorValues: indicators,
      reason: `Price ${currentPrice.toFixed(2)} within bands [${current.lower.toFixed(2)}, ${current.upper.toFixed(2)}]`,
    };
  }
}
