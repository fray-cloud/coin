import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderRequestedEvent } from '@coin/kafka-contracts';
import { BinanceRest } from '@coin/exchange-adapters';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeTokensService } from '../claude-tokens/claude-tokens.service';
import { LlmCliService, LlmDecision } from '../llm/llm-cli.service';
import { MarketContextService } from './market-context/market-context.service';
import type { MarketContext } from './market-context/market-context.types';
import { RequestSignalDto } from './dto/request-signal.dto';
import { ExecuteTradeDto } from './dto/execute-trade.dto';

@Injectable()
export class LlmTradesService {
  private readonly logger = new Logger(LlmTradesService.name);
  private readonly binance = new BinanceRest();
  private kafka: Kafka;
  private producer: Producer;
  private connected = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: ClaudeTokensService,
    private readonly llm: LlmCliService,
    private readonly marketContext: MarketContextService,
  ) {
    this.kafka = new Kafka({
      clientId: 'api-llm-trades',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
    this.connected = true;
  }

  async onModuleDestroy() {
    if (this.connected) await this.producer.disconnect();
  }

  async signal(
    userId: string,
    dto: RequestSignalDto,
  ): Promise<LlmDecision & { entryPrice: string; marketContext: MarketContext }> {
    const oauthToken = await this.tokens.getDecrypted(userId);
    const marketContext = await this.marketContext.build({
      symbol: dto.symbol,
      interval: dto.interval,
      promptCandleCount: dto.candleCount,
    });
    if (marketContext.candles.length === 0) {
      throw new BadRequestException(`No candles for ${dto.symbol} @ ${dto.interval}`);
    }
    const decision = await this.llm.decide({ oauthToken, marketContext });
    const lastCandle = marketContext.candles[marketContext.candles.length - 1];
    const entryPrice = lastCandle.c;

    await this.prisma.llmDecisionLog.create({
      data: {
        userId,
        prompt: `${dto.symbol} ${dto.interval} candles=${marketContext.candles.length} indicators+sentiment`,
        rawResponse: decision.rawResponse,
        parsedSignal: {
          signal: decision.signal,
          takeProfitPrice: decision.takeProfitPrice,
          stopLossPrice: decision.stopLossPrice,
          reasoning: decision.reasoning,
        },
        model: decision.model,
        latencyMs: decision.latencyMs,
      },
    });

    return { ...decision, entryPrice, marketContext };
  }

  async execute(userId: string, dto: ExecuteTradeDto): Promise<{ id: string; status: string }> {
    // Resolve exchange key. If unspecified, prefer testnet for safety.
    const keys = await this.prisma.exchangeKey.findMany({
      where: { userId, exchange: 'binance' },
    });
    if (keys.length === 0) {
      throw new NotFoundException('No Binance exchange key registered');
    }
    const key = dto.exchangeKeyId
      ? keys.find((k) => k.id === dto.exchangeKeyId)
      : (keys.find((k) => k.network === 'testnet') ?? keys[0]);
    if (!key) throw new NotFoundException('Specified exchange key not found');

    // Margin × leverage / entry = base-asset quantity. Then snap down to the
    // exchange's LOT_SIZE step (Binance rejects with -1111 otherwise) and
    // refuse if the snapped notional is below MIN_NOTIONAL.
    const rawQty = (dto.betUsdt * dto.leverage) / Number(dto.entryPrice);
    const filter = await this.binance.getSymbolFilter(dto.symbol);
    const step = Number(filter.stepSize);
    if (!step || step <= 0) {
      throw new BadRequestException(`No LOT_SIZE filter for ${dto.symbol}`);
    }
    const stepDecimals = (filter.stepSize.split('.')[1] ?? '').length;
    const snapped = Math.floor(rawQty / step) * step;
    const quantity = snapped.toFixed(stepDecimals);
    const notional = Number(quantity) * Number(dto.entryPrice);
    if (notional < Number(filter.minNotional || 0)) {
      throw new BadRequestException(
        `Notional ${notional.toFixed(2)} USDT < min ${filter.minNotional}; raise bet or leverage`,
      );
    }
    if (Number(quantity) < Number(filter.minQty || 0)) {
      throw new BadRequestException(
        `Quantity ${quantity} < minQty ${filter.minQty}; raise bet or leverage`,
      );
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        exchangeKeyId: key.id,
        exchange: 'binance',
        symbol: dto.symbol,
        side: dto.side,
        type: 'market',
        mode: 'real',
        status: 'pending',
        quantity,
        leverage: dto.leverage,
        marginType: 'ISOLATED',
        positionSide: dto.side,
        takeProfitPrice: dto.takeProfitPrice,
        stopLossPrice: dto.stopLossPrice,
      },
    });

    const requestId = randomUUID();
    const event: OrderRequestedEvent = {
      requestId,
      userId,
      exchangeKeyId: key.id,
      order: {
        exchange: 'binance',
        symbol: dto.symbol,
        side: dto.side,
        type: 'market',
        quantity,
        leverage: dto.leverage,
        marginType: 'ISOLATED',
        takeProfitPrice: dto.takeProfitPrice,
        stopLossPrice: dto.stopLossPrice,
      },
      mode: 'real',
      dbOrderId: order.id,
    };

    await this.producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_REQUESTED,
      messages: [{ key: userId, value: JSON.stringify(event) }],
    });

    this.logger.log(
      `LLM trade dispatched: ${order.id} (${dto.side} ${quantity} ${dto.symbol} ${dto.leverage}x, ${key.network})`,
    );

    return { id: order.id, status: 'pending' };
  }

  async listDecisions(userId: string, limit: number, cursor?: string) {
    const cursorDate = cursor ? new Date(cursor) : undefined;
    const rows = await this.prisma.llmDecisionLog.findMany({
      where: {
        userId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        order: {
          select: {
            id: true,
            status: true,
            symbol: true,
            side: true,
            entryPrice: true,
            takeProfitPrice: true,
            stopLossPrice: true,
            realizedPnl: true,
            closedAt: true,
            createdAt: true,
          },
        },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toISOString() : null;
    return { items, nextCursor };
  }
}
