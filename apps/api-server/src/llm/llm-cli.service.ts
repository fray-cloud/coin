import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { runClaudeCli } from './cli-runner';
import { TRADING_SYSTEM_PROMPT } from './prompts/trading-system';
import type { MarketContext } from '../llm-trades/market-context/market-context.types';

export interface LlmDecisionInput {
  oauthToken: string;
  marketContext: MarketContext;
}

export interface LlmDecision {
  signal: 'long' | 'short';
  takeProfitPrice: string;
  stopLossPrice: string;
  reasoning: string;
  rawResponse: string;
  latencyMs: number;
  model: string;
}

interface QueueItem {
  resolve: (v: LlmDecision) => void;
  reject: (e: Error) => void;
  input: LlmDecisionInput;
}

/**
 * Wraps the `claude` CLI subprocess with:
 * - Concurrency=1 queue (avoid Pro/Max rate-limit collisions, single user)
 * - 30s timeout
 * - 1 retry on parse failure
 * - Strict JSON validation (LONG: sl<entry<tp, SHORT: tp<entry<sl)
 *
 * The runtime calls `decide()` per signal request.
 */
@Injectable()
export class LlmCliService {
  private readonly logger = new Logger(LlmCliService.name);
  private readonly model = 'claude-sonnet-4-6';
  private queue: QueueItem[] = [];
  private running = false;

  decide(input: LlmDecisionInput): Promise<LlmDecision> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, input });
      void this.drain();
    });
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift()!;
        try {
          const result = await this.runOnce(item.input);
          item.resolve(result);
        } catch (err) {
          item.reject(err as Error);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async runOnce(input: LlmDecisionInput): Promise<LlmDecision> {
    const userPrompt = this.buildUserPrompt(input);

    let attempt = 0;
    let lastError: Error | undefined;
    while (attempt < 2) {
      attempt++;
      try {
        const cli = await runClaudeCli({
          prompt: userPrompt,
          oauthToken: input.oauthToken,
          systemPrompt: TRADING_SYSTEM_PROMPT,
          model: this.model,
          timeoutMs: 30_000,
        });

        if (cli.exitCode !== 0) {
          throw new Error(`claude cli exit ${cli.exitCode}: ${cli.stderr.slice(0, 500)}`);
        }

        const decision = this.parse(cli.stdout, input.marketContext);
        this.logger.log(
          `LLM decision for ${input.marketContext.symbol}: ${decision.signal} tp=${decision.takeProfitPrice} sl=${decision.stopLossPrice} (${cli.durationMs}ms)`,
        );
        return {
          ...decision,
          rawResponse: cli.stdout,
          latencyMs: cli.durationMs,
          model: this.model,
        };
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(`LLM attempt ${attempt} failed: ${lastError.message}`);
      }
    }
    throw lastError ?? new Error('LLM decide failed');
  }

  private buildUserPrompt(input: LlmDecisionInput): string {
    return JSON.stringify(input.marketContext);
  }

  private parse(
    cliStdout: string,
    marketContext: MarketContext,
  ): Omit<LlmDecision, 'rawResponse' | 'latencyMs' | 'model'> {
    let envelope: { result?: string };
    try {
      envelope = JSON.parse(cliStdout) as { result?: string };
    } catch {
      throw new BadRequestException('LLM CLI returned non-JSON envelope');
    }
    const inner = envelope.result?.trim();
    if (!inner) throw new BadRequestException('LLM returned empty result');

    let signal: {
      signal?: string;
      takeProfitPrice?: string;
      stopLossPrice?: string;
      reasoning?: string;
    };
    try {
      signal = JSON.parse(inner) as typeof signal;
    } catch {
      // Try to extract JSON from text (in case model wrapped in prose)
      const match = inner.match(/\{[\s\S]*\}/);
      if (!match) throw new BadRequestException(`LLM response not JSON: ${inner.slice(0, 200)}`);
      signal = JSON.parse(match[0]) as typeof signal;
    }

    if (signal.signal !== 'long' && signal.signal !== 'short') {
      throw new BadRequestException(`LLM returned invalid signal: ${signal.signal}`);
    }
    if (!signal.takeProfitPrice || !signal.stopLossPrice) {
      throw new BadRequestException('LLM response missing TP or SL');
    }

    const tp = Number(signal.takeProfitPrice);
    const sl = Number(signal.stopLossPrice);
    const lastCandle = marketContext.candles[marketContext.candles.length - 1];
    const lastClose = Number(lastCandle?.c);
    if (!Number.isFinite(tp) || !Number.isFinite(sl) || !Number.isFinite(lastClose)) {
      throw new BadRequestException('LLM returned non-numeric prices');
    }
    if (signal.signal === 'long' && !(sl < lastClose && lastClose < tp)) {
      throw new BadRequestException(`LONG TP/SL invalid: sl=${sl} entry≈${lastClose} tp=${tp}`);
    }
    if (signal.signal === 'short' && !(tp < lastClose && lastClose < sl)) {
      throw new BadRequestException(`SHORT TP/SL invalid: tp=${tp} entry≈${lastClose} sl=${sl}`);
    }

    return {
      signal: signal.signal,
      takeProfitPrice: signal.takeProfitPrice,
      stopLossPrice: signal.stopLossPrice,
      reasoning: signal.reasoning ?? '',
    };
  }
}
