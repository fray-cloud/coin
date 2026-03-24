import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PaperEngineService } from './paper-engine.service';

@Module({
  providers: [OrdersService, PaperEngineService],
  exports: [OrdersService, PaperEngineService],
})
export class OrdersModule {}
