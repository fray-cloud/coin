import { Injectable } from '@nestjs/common';
import type { MonteCarloConfig, MonteCarloResult, Trade } from './backtesting.types';

@Injectable()
export class MonteCarloService {
  /**
   * Simulates `numSimulations` random trade sequences by bootstrapping from `trades`,
   * then reports equity and drawdown percentiles.
   */
  simulate(config: MonteCarloConfig): MonteCarloResult {
    const numSimulations = config.numSimulations ?? 1000;
    const confidenceLevel = config.confidenceLevel ?? 0.95;
    const { trades, initialCapital } = config;

    if (trades.length === 0) {
      return {
        numSimulations,
        finalEquityPercentiles: this.buildPercentiles(
          Array(numSimulations).fill(initialCapital),
          confidenceLevel,
        ),
        maxDrawdownPercentiles: this.buildPercentiles(
          Array(numSimulations).fill(0),
          confidenceLevel,
        ),
        ruinProbability: 0,
        medianFinalEquity: initialCapital,
        medianMaxDrawdown: 0,
      };
    }

    const finalEquities: number[] = [];
    const maxDrawdowns: number[] = [];

    for (let sim = 0; sim < numSimulations; sim++) {
      const shuffled = this.bootstrapTrades(trades);
      const { finalEquity, maxDrawdown } = this.simulatePath(shuffled, initialCapital);
      finalEquities.push(finalEquity);
      maxDrawdowns.push(maxDrawdown);
    }

    finalEquities.sort((a, b) => a - b);
    maxDrawdowns.sort((a, b) => a - b);

    const ruinThreshold = initialCapital * 0.5;
    const ruinCount = finalEquities.filter((e) => e < ruinThreshold).length;

    return {
      numSimulations,
      finalEquityPercentiles: this.buildPercentiles(finalEquities, confidenceLevel),
      maxDrawdownPercentiles: this.buildPercentiles(maxDrawdowns, confidenceLevel),
      ruinProbability: ruinCount / numSimulations,
      medianFinalEquity: this.percentile(finalEquities, 0.5),
      medianMaxDrawdown: this.percentile(maxDrawdowns, 0.5),
    };
  }

  /**
   * Bootstraps a new sequence by sampling with replacement from existing trades.
   */
  private bootstrapTrades(trades: Trade[]): Trade[] {
    const n = trades.length;
    return Array.from({ length: n }, () => trades[Math.floor(Math.random() * n)]);
  }

  private simulatePath(
    trades: Trade[],
    initialCapital: number,
  ): { finalEquity: number; maxDrawdown: number } {
    let equity = initialCapital;
    let peak = initialCapital;
    let maxDrawdown = 0;

    for (const trade of trades) {
      equity += trade.pnl;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
      // Stop if bankrupt
      if (equity <= 0) {
        equity = 0;
        maxDrawdown = 100;
        break;
      }
    }

    return { finalEquity: equity, maxDrawdown };
  }

  private buildPercentiles(sorted: number[], confidenceLevel: number): Record<string, number> {
    const tail = (1 - confidenceLevel) / 2;
    return {
      [String(Math.round(tail * 100))]: this.percentile(sorted, tail),
      '25': this.percentile(sorted, 0.25),
      '50': this.percentile(sorted, 0.5),
      '75': this.percentile(sorted, 0.75),
      [String(Math.round((1 - tail) * 100))]: this.percentile(sorted, 1 - tail),
    };
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = p * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return Math.round(sorted[lower] * 100) / 100;
    const frac = idx - lower;
    return Math.round((sorted[lower] * (1 - frac) + sorted[upper] * frac) * 100) / 100;
  }
}
