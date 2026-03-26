import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../prisma/prisma.service';
import { GetNotificationSettingsQuery } from './get-notification-settings.query';

@QueryHandler(GetNotificationSettingsQuery)
export class GetNotificationSettingsHandler implements IQueryHandler<GetNotificationSettingsQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetNotificationSettingsQuery) {
    const setting = await this.prisma.notificationSetting.findUnique({
      where: { userId: query.userId },
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
}
