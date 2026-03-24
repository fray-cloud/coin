import { Module } from '@nestjs/common';
import { ExchangeKeysController } from './exchange-keys.controller';
import { ExchangeKeysService } from './exchange-keys.service';

@Module({
  controllers: [ExchangeKeysController],
  providers: [ExchangeKeysService],
})
export class ExchangeKeysModule {}
