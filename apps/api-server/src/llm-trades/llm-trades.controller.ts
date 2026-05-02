import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LlmTradesService } from './llm-trades.service';
import { RequestSignalDto } from './dto/request-signal.dto';
import { ExecuteTradeDto } from './dto/execute-trade.dto';

@ApiTags('LLM Trades')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('llm-trades')
export class LlmTradesController {
  constructor(private readonly service: LlmTradesService) {}

  @Post('signal')
  @ApiOperation({
    summary: 'Fetch candles + ask Claude for long/short + TP/SL (sync, ~5-10s)',
  })
  signal(@CurrentUser() user: { id: string }, @Body() dto: RequestSignalDto) {
    return this.service.signal(user.id, dto);
  }

  @Post('execute')
  @ApiOperation({
    summary: 'Place futures market order with attached TP/SL via worker saga',
  })
  execute(@CurrentUser() user: { id: string }, @Body() dto: ExecuteTradeDto) {
    return this.service.execute(user.id, dto);
  }

  @Get('decisions')
  @ApiOperation({
    summary: 'List recent LLM decisions for the current user (newest first)',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default 20, max 100)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'createdAt ISO cursor' })
  decisions(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsed = Math.min(100, Math.max(1, limit ? parseInt(limit, 10) : 20));
    return this.service.listDecisions(user.id, parsed, cursor);
  }
}
