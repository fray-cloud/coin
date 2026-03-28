import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivityService } from './activity.service';
import type { User } from '@coin/database';

@ApiTags('Activity')
@ApiBearerAuth('access-token')
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: '커서 기반 페이지네이션으로 활동 피드 조회' })
  @ApiResponse({ status: 200, description: '활동 피드 반환' })
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
