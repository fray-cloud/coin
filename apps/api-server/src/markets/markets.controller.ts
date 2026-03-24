import { Controller, Get, Param } from '@nestjs/common';
import { MarketsService } from './markets.service';

@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get('tickers')
  async getAllTickers() {
    return this.marketsService.getAllTickers();
  }

  @Get('ticker/:exchange/:symbol')
  async getTicker(
    @Param('exchange') exchange: string,
    @Param('symbol') symbol: string,
  ) {
    const ticker = await this.marketsService.getLatestTicker(exchange, symbol);
    if (!ticker) {
      return { error: 'Ticker not found' };
    }
    return ticker;
  }
}
