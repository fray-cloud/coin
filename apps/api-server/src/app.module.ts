import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { MarketsModule } from './markets/markets.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExchangeKeysModule } from './exchange-keys/exchange-keys.module';
import { OrdersModule } from './orders/orders.module';
import { StrategiesModule } from './strategies/strategies.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { ActivityModule } from './activity/activity.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
        serializers: {
          req: (req: any) => ({ method: req.method, url: req.url }),
          res: (res: any) => ({ statusCode: res.statusCode }),
        },
        autoLogging: {
          ignore: (req: any) => req.url === '/health' || req.url === '/ready',
        },
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    TerminusModule,
    PrismaModule,
    AuthModule,
    MarketsModule,
    ExchangeKeysModule,
    OrdersModule,
    StrategiesModule,
    NotificationsModule,
    PortfolioModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
