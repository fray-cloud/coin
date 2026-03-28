import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetPortfolioSummaryQuery } from './queries';
import type { User } from '@coin/database';

@ApiTags('Portfolio')
@ApiBearerAuth('access-token')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated portfolio summary across all exchanges' })
  @ApiResponse({ status: 200, description: 'Portfolio summary returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['paper', 'real', 'all'],
    description: 'Filter by trading mode',
  })
  async getSummary(
    @CurrentUser() user: User,
    @Query('mode') mode?: 'paper' | 'real' | 'all',
  ): Promise<unknown> {
    return this.queryBus.execute(new GetPortfolioSummaryQuery(user.id, mode));
  }
}
