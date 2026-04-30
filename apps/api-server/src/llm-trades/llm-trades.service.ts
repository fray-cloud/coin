import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderRequestedEvent } from '@coin/kafka-contracts';
import { BinanceRest } from '@coin/exchange-adapters';
import type { Candle } from '@coin/types';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeTokensService } from '../claude-tokens/claude-tokens.service';
import { LlmCliService, LlmDecision } from '../llm/llm-cli.service';
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
  ): Promise<LlmDecision & { entryPrice: string; candles: Candle[] }> {
    const oauthToken = await this.tokens.getDecrypted(userId);
    const candles = await this.binance.getCandles(dto.symbol, dto.interval, dto.candleCount);
    if (candles.length === 0) {
      throw new BadRequestException(`No candles for ${dto.symbol} @ ${dto.interval}`);
    }
    const decision = await this.llm.decide({
      oauthToken,
      symbol: dto.symbol,
      interval: dto.interval,
      candles,
    });
    const entryPrice = candles[candles.length - 1].close;

    await this.prisma.llmDecisionLog.create({
      data: {
        userId,
        prompt: `${dto.symbol} ${dto.interval} ${dto.candleCount}`,
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

    return { ...decision, entryPrice, candles };
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

    // Margin × leverage / entry = base-asset quantity
    const quantity = ((dto.betUsdt * dto.leverage) / Number(dto.entryPrice)).toFixed(6);

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
}
