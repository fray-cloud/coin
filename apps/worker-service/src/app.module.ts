import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { OrdersModule } from './orders/orders.module';
import { StrategiesModule } from './strategies/strategies.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
      },
    }),
    PrismaModule,
    OrdersModule,
    ExchangesModule,
    StrategiesModule,
  ],
})
export class AppModule {}
