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
  @ApiOperation({
    summary: '사용자 알림 설정 조회',
    description:
      '현재 사용자의 알림 설정을 조회합니다. 텔레그램 채팅 ID, 주문/시그널/리스크 알림 활성화 상태를 포함합니다.',
  })
  @ApiResponse({ status: 200, description: '알림 설정 반환' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async getSettings(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetNotificationSettingsQuery(user.id));
  }

  @Patch('settings')
  @ApiOperation({
    summary: '사용자 알림 설정 변경',
    description:
      '알림 설정을 변경합니다. 텔레그램 Chat ID 연결, 알림 유형별 활성/비활성을 설정할 수 있습니다.',
  })
  @ApiResponse({ status: 200, description: '알림 설정 변경 성공' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  async updateSettings(@CurrentUser() user: User, @Body() dto: UpdateNotificationSettingDto) {
    return this.commandBus.execute(new UpdateNotificationSettingCommand(user.id, dto));
  }
}
