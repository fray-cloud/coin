import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivityService } from './activity.service';
import type { User } from '@coin/database';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
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
