import { Module } from '@nestjs/common';
import { MarketsGateway } from './markets.gateway';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [MarketsGateway, MarketsService],
  controllers: [MarketsController],
  exports: [MarketsService],
})
export class MarketsModule {}
