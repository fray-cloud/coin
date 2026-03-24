import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MarketsModule } from './markets/markets.module';

@Module({
  imports: [MarketsModule],
  controllers: [AppController],
})
export class AppModule {}
