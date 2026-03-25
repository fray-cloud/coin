import { Controller, Get, Patch, Body } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';
import type { User } from '@coin/database';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('settings')
  async getSettings(@CurrentUser() user: User) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { userId: user.id },
    });
    return (
      setting || {
        telegramChatId: null,
        notifyOrders: true,
        notifySignals: true,
        notifyRisks: false,
      }
    );
  }

  @Patch('settings')
  async updateSettings(@CurrentUser() user: User, @Body() dto: UpdateNotificationSettingDto) {
    return this.prisma.notificationSetting.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...dto,
      },
      update: dto,
    });
  }
}
