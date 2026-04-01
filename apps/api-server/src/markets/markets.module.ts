import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { MarketsGateway } from './markets.gateway';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { FlowsModule } from '../flows/flows.module';
import { OrderLifecycleOrchestrator } from '../orders/sagas/order-lifecycle.orchestrator';

@Module({
  imports: [NotificationsModule, OrdersModule, FlowsModule],
  providers: [MarketsGateway, MarketsService],
  controllers: [MarketsController],
  exports: [MarketsService],
})
export class MarketsModule implements OnModuleInit {
  constructor(
    private readonly marketsService: MarketsService,
    private readonly orchestrator: OrderLifecycleOrchestrator,
  ) {}

  onModuleInit() {
    this.marketsService.setOrchestrator(this.orchestrator);
  }
}
