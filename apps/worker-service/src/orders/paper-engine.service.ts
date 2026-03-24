import { Injectable, Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import Redis from 'ioredis';
import { KAFKA_TOPICS } from '@coin/kafka-contracts';
import type { OrderResultEvent } from '@coin/kafka-contracts';
import type { ExchangeId, OrderResult, Ticker } from '@coin/types';
import { PrismaService } from '../prisma/prisma.service';

const PAPER_FEE_RATE = '0.001'; // 0.1%

@Injectable()
export class PaperEngineService {
  private readonly logger = new Logger(PaperEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 시장가 주문: Redis에서 현재가 조회 → 즉시 체결
   */
  async executeMarketOrder(
    dbOrderId: string,
    userId: string,
    exchange: ExchangeId,
    symbol: string,
    side: 'buy' | 'sell',
    quantity: string,
    redis: Redis,
    producer: Producer,
  ): Promise<OrderResult> {
    const tickerKey = `ticker:${exchange}:${symbol}`;
    const tickerJson = await redis.get(tickerKey);

    if (!tickerJson) {
      return this.failOrder(
        dbOrderId,
        exchange,
        symbol,
        side,
        'market',
        quantity,
        producer,
        userId,
        `No ticker data for ${exchange}:${symbol}`,
      );
    }

    const ticker: Ticker = JSON.parse(tickerJson);
    const price = ticker.price;
    const fee = (parseFloat(quantity) * parseFloat(price) * parseFloat(PAPER_FEE_RATE)).toString();
    const quoteAsset = this.guessQuoteAsset(exchange, symbol);

    const result: OrderResult = {
      exchange,
      orderId: `paper-${dbOrderId}`,
      symbol,
      side,
      type: 'market',
      status: 'filled',
      quantity,
      filledQuantity: quantity,
      price,
      filledPrice: price,
      fee,
      feeCurrency: quoteAsset,
      timestamp: Date.now(),
    };

    await this.prisma.order.update({
      where: { id: dbOrderId },
      data: {
        status: 'filled',
        exchangeOrderId: result.orderId,
        filledQuantity: result.filledQuantity,
        filledPrice: result.filledPrice,
        fee: result.fee,
        feeCurrency: result.feeCurrency,
      },
    });

    await this.publishResult(producer, userId, dbOrderId, result);
    return result;
  }

  /**
   * 지정가 주문: 현재가와 비교 → 체결 가능하면 filled, 아니면 placed
   */
  async placeLimitOrder(
    dbOrderId: string,
    userId: string,
    exchange: ExchangeId,
    symbol: string,
    side: 'buy' | 'sell',
    quantity: string,
    price: string,
    redis: Redis,
    producer: Producer,
  ): Promise<OrderResult> {
    const tickerKey = `ticker:${exchange}:${symbol}`;
    const tickerJson = await redis.get(tickerKey);
    const currentPrice = tickerJson ? parseFloat(JSON.parse(tickerJson).price) : null;

    // 즉시 체결 가능한지 확인
    const canFill =
      currentPrice !== null && this.canFillLimit(side, parseFloat(price), currentPrice);

    if (canFill) {
      const fee = (
        parseFloat(quantity) *
        parseFloat(price) *
        parseFloat(PAPER_FEE_RATE)
      ).toString();
      const quoteAsset = this.guessQuoteAsset(exchange, symbol);

      const result: OrderResult = {
        exchange,
        orderId: `paper-${dbOrderId}`,
        symbol,
        side,
        type: 'limit',
        status: 'filled',
        quantity,
        filledQuantity: quantity,
        price,
        filledPrice: price,
        fee,
        feeCurrency: quoteAsset,
        timestamp: Date.now(),
      };

      await this.prisma.order.update({
        where: { id: dbOrderId },
        data: {
          status: 'filled',
          exchangeOrderId: result.orderId,
          filledQuantity: result.filledQuantity,
          filledPrice: result.filledPrice,
          fee: result.fee,
          feeCurrency: result.feeCurrency,
        },
      });

      await this.publishResult(producer, userId, dbOrderId, result);
      return result;
    }

    // 즉시 체결 불가 → placed 상태로 대기
    const result: OrderResult = {
      exchange,
      orderId: `paper-${dbOrderId}`,
      symbol,
      side,
      type: 'limit',
      status: 'placed',
      quantity,
      filledQuantity: '0',
      price,
      filledPrice: '0',
      fee: '0',
      feeCurrency: '',
      timestamp: Date.now(),
    };

    await this.prisma.order.update({
      where: { id: dbOrderId },
      data: {
        status: 'placed',
        exchangeOrderId: result.orderId,
      },
    });

    await this.publishResult(producer, userId, dbOrderId, result);
    return result;
  }

  /**
   * 시세 모니터링: ticker 업데이트마다 호출 → pending paper limit order 체결 체크
   */
  async checkPendingOrders(ticker: Ticker, producer: Producer) {
    try {
      const pendingOrders = await this.prisma.order.findMany({
        where: {
          mode: 'paper',
          status: 'placed',
          exchange: ticker.exchange,
          symbol: ticker.symbol,
        },
      });

      if (pendingOrders.length === 0) return;

      const currentPrice = parseFloat(ticker.price);

      for (const order of pendingOrders) {
        const orderPrice = parseFloat(order.price || '0');
        if (!this.canFillLimit(order.side as 'buy' | 'sell', orderPrice, currentPrice)) continue;

        const fee = (
          parseFloat(order.quantity) *
          orderPrice *
          parseFloat(PAPER_FEE_RATE)
        ).toString();
        const quoteAsset = this.guessQuoteAsset(order.exchange as ExchangeId, order.symbol);

        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'filled',
            filledQuantity: order.quantity,
            filledPrice: order.price || '0',
            fee,
            feeCurrency: quoteAsset,
          },
        });

        const result: OrderResult = {
          exchange: order.exchange as ExchangeId,
          orderId: order.exchangeOrderId || `paper-${order.id}`,
          symbol: order.symbol,
          side: order.side as 'buy' | 'sell',
          type: 'limit',
          status: 'filled',
          quantity: order.quantity,
          filledQuantity: order.quantity,
          price: order.price || '0',
          filledPrice: order.price || '0',
          fee,
          feeCurrency: quoteAsset,
          timestamp: Date.now(),
        };

        await this.publishResult(producer, order.userId, order.id, result);
        this.logger.log(
          `Paper limit order filled: ${order.id} (${order.side} ${order.symbol} @ ${order.price})`,
        );
      }
    } catch (err) {
      this.logger.error(`Failed to check pending orders: ${err}`);
    }
  }

  private canFillLimit(side: 'buy' | 'sell', orderPrice: number, currentPrice: number): boolean {
    // buy limit: 주문가 >= 현재가 → 체결
    // sell limit: 주문가 <= 현재가 → 체결
    return side === 'buy' ? orderPrice >= currentPrice : orderPrice <= currentPrice;
  }

  private async failOrder(
    dbOrderId: string,
    exchange: ExchangeId,
    symbol: string,
    side: 'buy' | 'sell',
    type: 'limit' | 'market',
    quantity: string,
    producer: Producer,
    userId: string,
    reason: string,
  ): Promise<OrderResult> {
    this.logger.warn(`Paper order failed: ${reason}`);

    const result: OrderResult = {
      exchange,
      orderId: `paper-${dbOrderId}`,
      symbol,
      side,
      type,
      status: 'failed',
      quantity,
      filledQuantity: '0',
      price: '0',
      filledPrice: '0',
      fee: '0',
      feeCurrency: '',
      timestamp: Date.now(),
    };

    await this.prisma.order.update({
      where: { id: dbOrderId },
      data: { status: 'failed' },
    });

    await this.publishResult(producer, userId, dbOrderId, result);
    return result;
  }

  private async publishResult(
    producer: Producer,
    userId: string,
    dbOrderId: string,
    result: OrderResult,
  ) {
    const event: OrderResultEvent = {
      requestId: dbOrderId,
      userId,
      dbOrderId,
      result,
      mode: 'paper',
    };

    await producer.send({
      topic: KAFKA_TOPICS.TRADING_ORDER_RESULT,
      messages: [{ key: userId, value: JSON.stringify(event) }],
    });
  }

  private guessQuoteAsset(exchange: ExchangeId, symbol: string): string {
    if (exchange === 'upbit') return 'KRW';
    if (symbol.endsWith('USDT')) return 'USDT';
    if (symbol.endsWith('BUSD')) return 'BUSD';
    return 'USDT';
  }
}
