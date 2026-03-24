import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ExchangesService } from './exchanges.service';

@Module({
  imports: [OrdersModule],
  providers: [ExchangesService],
  exports: [ExchangesService],
})
export class ExchangesModule {}
