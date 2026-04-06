import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { OrdersModule } from './orders/orders.module';
import { StrategiesModule } from './strategies/strategies.module';
import { BacktestsModule } from './backtests/backtests.module';
import { FlowsModule } from './flows/flows.module';
import { BacktestingModule } from './backtesting/backtesting.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport: {
          targets: [
            { target: 'pino/file', options: { destination: '/app/logs/app.log', mkdir: true } },
            process.env.NODE_ENV !== 'production'
              ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
              : { target: 'pino/file', options: { destination: 1 } },
          ],
        },
      },
    }),
    PrismaModule,
    OrdersModule,
    ExchangesModule,
    StrategiesModule,
    BacktestsModule,
    FlowsModule,
    BacktestingModule,
  ],
})
export class AppModule {}
