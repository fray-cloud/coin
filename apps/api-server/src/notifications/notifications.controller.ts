import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateNotificationSettingCommand } from './commands';
import { GetNotificationSettingsQuery } from './queries';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import type { User } from '@coin/database';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('settings')
  @ApiOperation({ summary: 'Retrieve the current notification settings for the user' })
  @ApiResponse({ status: 200, description: 'Notification settings returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSettings(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetNotificationSettingsQuery(user.id));
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update notification preferences for the user' })
  @ApiResponse({ status: 200, description: 'Notification settings updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateSettings(@CurrentUser() user: User, @Body() dto: UpdateNotificationSettingDto) {
    return this.commandBus.execute(new UpdateNotificationSettingCommand(user.id, dto));
  }
}
