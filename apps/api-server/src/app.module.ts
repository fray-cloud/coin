import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MarketsModule } from './markets/markets.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, MarketsModule],
  controllers: [AppController],
})
export class AppModule {}
