import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: '대시보드 단일 집계 (오늘/이번주 PnL · 활성 포지션 · 최근 LLM 결정)',
  })
  summary(@CurrentUser() user: { id: string }) {
    return this.service.getSummary(user.id);
  }
}
