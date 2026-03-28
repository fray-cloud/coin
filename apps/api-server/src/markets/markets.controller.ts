import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { Public } from '../auth/decorators/public.decorator';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId } from '@coin/types';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

@Public()
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get('tickers')
  async getAllTickers() {
    return this.marketsService.getAllTickers();
  }

  @Get('exchange-rate')
  async getExchangeRate() {
    const rate = await this.marketsService.getExchangeRate();
    return rate ?? { krwPerUsd: 0, updatedAt: null };
  }

  @Get('candles/:exchange/:symbol')
  async getCandles(
    @Param('exchange') exchange: string,
    @Param('symbol') symbol: string,
    @Query('interval') interval = '1h',
    @Query('limit') limit = '200',
  ) {
    const adapterFactory = REST_ADAPTERS[exchange as ExchangeId];
    if (!adapterFactory) {
      throw new NotFoundException(`Exchange ${exchange} not found`);
    }
    const adapter = adapterFactory();
    return adapter.getCandles(symbol, interval, Math.min(Number(limit), 500));
  }

  @Get('ticker/:exchange/:symbol')
  async getTicker(@Param('exchange') exchange: string, @Param('symbol') symbol: string) {
    const ticker = await this.marketsService.getLatestTicker(exchange, symbol);
    if (!ticker) {
      throw new NotFoundException('Ticker not found');
    }
    return ticker;
  }
}
