import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { TelegramService } from './telegram.service';
import { NotificationCommandHandlers } from './commands';
import { NotificationQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    TelegramService,
    ...NotificationCommandHandlers,
    ...NotificationQueryHandlers,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
