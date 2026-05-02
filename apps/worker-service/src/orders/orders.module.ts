import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PositionReconcilerService } from './reconciler/position-reconciler.service';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [RiskModule],
  providers: [OrdersService, PositionReconcilerService],
  exports: [OrdersService],
})
export class OrdersModule {}
