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
  @ApiOperation({
    summary: '모든 거래소의 통합 포트폴리오 요약 조회',
    description:
      '## 포트폴리오 집계\n\n- **전체(all)**: 실제 거래소 잔고 + 모든 체결 주문 기반 손익\n- **실전(real)**: 실제 거래소 API에서 잔고 조회\n- **모의(paper)**: 모의 주문 이력 기반 가상 잔고 계산',
  })
  @ApiResponse({ status: 200, description: '포트폴리오 요약 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['paper', 'real', 'all'],
    description: '거래 모드 필터',
  })
  async getSummary(
    @CurrentUser() user: User,
    @Query('mode') mode?: 'paper' | 'real' | 'all',
  ): Promise<unknown> {
    return this.queryBus.execute(new GetPortfolioSummaryQuery(user.id, mode));
  }
}
