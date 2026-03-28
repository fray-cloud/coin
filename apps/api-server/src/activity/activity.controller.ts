import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ActivityListResponse } from './dto/activity-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivityService } from './activity.service';
import type { User } from '@coin/database';

@ApiTags('Activity')
@ApiBearerAuth('access-token')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({
    summary: '커서 기반 페이지네이션으로 활동 피드 조회',
    description:
      '사용자의 활동 피드를 조회합니다. 주문 체결, 전략 시그널, 리스크 차단, 로그인/로그아웃 이력이 시간순으로 통합되어 반환됩니다. 커서 기반 페이지네이션을 지원합니다.',
  })
  @ApiResponse({ status: 200, description: '활동 피드 반환', type: ActivityListResponse })
  @ApiResponse({ status: 401, description: '인증 필요' })
  @ApiQuery({ name: 'cursor', required: false, description: '페이지네이션 커서' })
  @ApiQuery({ name: 'limit', required: false, description: '페이지당 항목 수' })
  async getActivity(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getActivity(
      user.id,
      cursor,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
