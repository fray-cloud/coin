import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MarketsService } from './markets.service';
import { Public } from '../auth/decorators/public.decorator';
import { UpbitRest, BinanceRest, BybitRest, IExchangeRest } from '@coin/exchange-adapters';
import type { ExchangeId } from '@coin/types';

const REST_ADAPTERS: Record<ExchangeId, () => IExchangeRest> = {
  upbit: () => new UpbitRest(),
  binance: () => new BinanceRest(),
  bybit: () => new BybitRest(),
};

@ApiTags('Markets')
@Public()
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get('tickers')
  @ApiOperation({ summary: 'Retrieve all cached tickers across exchanges' })
  @ApiResponse({ status: 200, description: 'Ticker list returned' })
  async getAllTickers() {
    return this.marketsService.getAllTickers();
  }

  @Get('exchange-rate')
  @ApiOperation({ summary: 'Get the current KRW/USD exchange rate' })
  @ApiResponse({ status: 200, description: 'Exchange rate returned' })
  async getExchangeRate() {
    const rate = await this.marketsService.getExchangeRate();
    return rate ?? { krwPerUsd: 0, updatedAt: null };
  }

  @Get('candles/:exchange/:symbol')
  @ApiOperation({ summary: 'Fetch candlestick (OHLCV) data for a symbol on an exchange' })
  @ApiResponse({ status: 200, description: 'Candle data returned' })
  @ApiResponse({ status: 404, description: 'Exchange not found' })
  @ApiParam({ name: 'exchange', description: 'Exchange identifier (upbit, binance, bybit)' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol (e.g., BTC/KRW)' })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: 'Candle interval (e.g., 1m, 5m, 1h, 1d). Defaults to 1h',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of candles to return (max 500). Defaults to 200',
  })
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
  @ApiOperation({ summary: 'Get the latest ticker for a specific symbol on an exchange' })
  @ApiResponse({ status: 200, description: 'Ticker data returned' })
  @ApiResponse({ status: 404, description: 'Ticker not found' })
  @ApiParam({ name: 'exchange', description: 'Exchange identifier (upbit, binance, bybit)' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol (e.g., BTC/KRW)' })
  async getTicker(@Param('exchange') exchange: string, @Param('symbol') symbol: string) {
    const ticker = await this.marketsService.getLatestTicker(exchange, symbol);
    if (!ticker) {
      throw new NotFoundException('Ticker not found');
    }
    return ticker;
  }
}
