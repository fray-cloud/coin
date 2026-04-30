import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [RiskModule],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
