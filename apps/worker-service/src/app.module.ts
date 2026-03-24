import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [PrismaModule, OrdersModule, ExchangesModule],
})
export class AppModule {}
