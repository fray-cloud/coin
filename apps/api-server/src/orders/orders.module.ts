import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersController } from './orders.controller';
import { OrderCommandHandlers } from './commands';
import { OrderQueryHandlers } from './queries';
import { OrderLifecycleOrchestrator } from './sagas/order-lifecycle.orchestrator';
import { SagaTimeoutWatchdog } from './sagas/saga-timeout.watchdog';

@Module({
  imports: [CqrsModule],
  controllers: [OrdersController],
  providers: [
    ...OrderCommandHandlers,
    ...OrderQueryHandlers,
    OrderLifecycleOrchestrator,
    SagaTimeoutWatchdog,
  ],
  exports: [OrderLifecycleOrchestrator],
})
export class OrdersModule {}
