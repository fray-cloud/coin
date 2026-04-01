import type { ITradingStrategy } from '../strategies/strategy.interface';
import { calculateMetrics } from './metrics.calculator';
import type {
  OhlcvCandle,
  BacktestConfig,
  BacktestResult,
  Trade,
  EquityPoint,
} from './backtesting.types';

/**
 * Replays a strategy over a sequence of OHLCV candles and returns full backtest results.
 *
 * Simulation rules:
 *  - Long-only: buy on 'buy' signal, sell on 'sell' signal.
 *  - One open position at a time.
 *  - Orders execute at the OPEN price of the next candle (to avoid look-ahead bias).
 *  - Position size = available capital * positionSizeFraction / entryPrice.
 *  - Fee charged on entry and exit as a fraction of notional value.
 *  - Open position force-closed at the last candle's close if still held at end.
 */
export function runBacktest(
  candles: OhlcvCandle[],
  strategy: ITradingStrategy,
  config: BacktestConfig,
): BacktestResult {
  const positionSizeFraction = config.positionSizeFraction ?? 1.0;
  const feeRate = config.feeRate ?? 0.001;
  let capital = config.initialCapital;

  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [{ timestamp: candles[0].timestamp, equity: capital }];

  let inPosition = false;
  let entryPrice = 0;
  let entryTime = 0;
  let quantity = 0;
  let entryFee = 0;

  // We need at least 2 candles: one to generate a signal, one to execute on.
  for (let i = 0; i < candles.length - 1; i++) {
    const closePrices = candles.slice(0, i + 1).map((c) => c.close);
    const evaluation = strategy.evaluate(closePrices, config.strategyConfig);
    const executionCandle = candles[i + 1];
    const executionPrice = executionCandle.open;

    if (!inPosition && evaluation.signal === 'buy') {
      const notional = capital * positionSizeFraction;
      const fee = notional * feeRate;
      quantity = (notional - fee) / executionPrice;
      entryFee = fee;
      entryPrice = executionPrice;
      entryTime = executionCandle.timestamp;
      capital -= notional;
      inPosition = true;
    } else if (inPosition && evaluation.signal === 'sell') {
      const exitNotional = quantity * executionPrice;
      const exitFee = exitNotional * feeRate;
      const proceeds = exitNotional - exitFee;
      capital += proceeds;

      const pnl = proceeds - (quantity * entryPrice + entryFee);
      const pnlPercent = (pnl / (quantity * entryPrice + entryFee)) * 100;

      trades.push({
        entryTime,
        exitTime: executionCandle.timestamp,
        entryPrice,
        exitPrice: executionPrice,
        quantity,
        pnl,
        pnlPercent,
        fee: entryFee + exitFee,
      });

      inPosition = false;
      quantity = 0;
    }

    // Record equity at each candle (mark-to-market open position at close price)
    const markToMarket = inPosition ? quantity * executionCandle.close : 0;
    equityCurve.push({
      timestamp: executionCandle.timestamp,
      equity: capital + markToMarket,
    });
  }

  // Force-close any open position at the last candle's close
  if (inPosition && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const exitNotional = quantity * lastCandle.close;
    const exitFee = exitNotional * feeRate;
    const proceeds = exitNotional - exitFee;
    capital += proceeds;

    const pnl = proceeds - (quantity * entryPrice + entryFee);
    const pnlPercent = (pnl / (quantity * entryPrice + entryFee)) * 100;

    trades.push({
      entryTime,
      exitTime: lastCandle.timestamp,
      entryPrice,
      exitPrice: lastCandle.close,
      quantity,
      pnl,
      pnlPercent,
      fee: entryFee + exitFee,
    });

    equityCurve[equityCurve.length - 1] = { timestamp: lastCandle.timestamp, equity: capital };
  }

  const startTime = candles[0].timestamp;
  const endTime = candles[candles.length - 1].timestamp;
  const metrics = calculateMetrics(trades, equityCurve, config.initialCapital, startTime, endTime);

  return { config, metrics, trades, equityCurve };
}
