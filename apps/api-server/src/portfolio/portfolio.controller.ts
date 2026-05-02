import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PortfolioSummaryResponse } from './dto/portfolio-response.dto';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetPortfolioSummaryQuery } from './queries';
import type { PortfolioNetwork } from './queries/get-portfolio-summary.query';
import type { User } from '@coin/database';

@ApiTags('Portfolio')
@ApiBearerAuth('access-token')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  @ApiOperation({
    summary: '포트폴리오 요약 (네트워크 분리)',
    description:
      '실제 거래소 잔고와 체결된 주문 기반의 손익을 반환합니다. `network`로 testnet/mainnet/all 필터링이 가능하며, all 응답에는 `byNetwork` 분할 합계가 포함됩니다.',
  })
  @ApiResponse({ status: 200, description: '포트폴리오 요약 반환', type: PortfolioSummaryResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiQuery({
    name: 'network',
    required: false,
    enum: ['testnet', 'mainnet', 'all'],
    description: '거래 네트워크 필터',
  })
  async getSummary(
    @CurrentUser() user: User,
    @Query('network') network?: PortfolioNetwork,
  ): Promise<unknown> {
    return this.queryBus.execute(new GetPortfolioSummaryQuery(user.id, network));
  }
}
