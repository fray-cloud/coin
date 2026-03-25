import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { MarketsModule } from './markets/markets.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExchangeKeysModule } from './exchange-keys/exchange-keys.module';
import { OrdersModule } from './orders/orders.module';
import { StrategiesModule } from './strategies/strategies.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    MarketsModule,
    ExchangeKeysModule,
    OrdersModule,
    StrategiesModule,
    NotificationsModule,
    PortfolioModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
