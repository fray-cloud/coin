import { Controller, Get, Patch, Body } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateNotificationSettingCommand } from './commands';
import { GetNotificationSettingsQuery } from './queries';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import type { User } from '@coin/database';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('settings')
  async getSettings(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetNotificationSettingsQuery(user.id));
  }

  @Patch('settings')
  async updateSettings(@CurrentUser() user: User, @Body() dto: UpdateNotificationSettingDto) {
    return this.commandBus.execute(new UpdateNotificationSettingCommand(user.id, dto));
  }
}
