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
  @ApiOperation({ summary: '모든 거래소의 캐시된 티커 조회' })
  @ApiResponse({ status: 200, description: '티커 목록 반환' })
  async getAllTickers() {
    return this.marketsService.getAllTickers();
  }

  @Get('exchange-rate')
  @ApiOperation({ summary: '현재 KRW/USD 환율 조회' })
  @ApiResponse({ status: 200, description: '환율 반환' })
  async getExchangeRate() {
    const rate = await this.marketsService.getExchangeRate();
    return rate ?? { krwPerUsd: 0, updatedAt: null };
  }

  @Get('candles/:exchange/:symbol')
  @ApiOperation({ summary: '거래소의 심볼에 대한 캔들스틱(OHLCV) 데이터 조회' })
  @ApiResponse({ status: 200, description: '캔들 데이터 반환' })
  @ApiResponse({ status: 404, description: '거래소를 찾을 수 없음' })
  @ApiParam({ name: 'exchange', description: '거래소 식별자 (upbit, binance, bybit)' })
  @ApiParam({ name: 'symbol', description: '트레이딩 심볼 (예: BTC/KRW)' })
  @ApiQuery({
    name: 'interval',
    required: false,
    description: '캔들 간격 (예: 1m, 5m, 1h, 1d). 기본값: 1h',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '반환할 캔들 수 (최대 500). 기본값: 200',
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
  @ApiOperation({ summary: '거래소의 특정 심볼 최신 티커 조회' })
  @ApiResponse({ status: 200, description: '티커 데이터 반환' })
  @ApiResponse({ status: 404, description: '티커를 찾을 수 없음' })
  @ApiParam({ name: 'exchange', description: '거래소 식별자 (upbit, binance, bybit)' })
  @ApiParam({ name: 'symbol', description: '트레이딩 심볼 (예: BTC/KRW)' })
  async getTicker(@Param('exchange') exchange: string, @Param('symbol') symbol: string) {
    const ticker = await this.marketsService.getLatestTicker(exchange, symbol);
    if (!ticker) {
      throw new NotFoundException('Ticker not found');
    }
    return ticker;
  }
}
