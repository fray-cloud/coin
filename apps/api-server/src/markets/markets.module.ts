import { Module } from '@nestjs/common';
import { MarketsGateway } from './markets.gateway';
import { MarketsService } from './markets.service';
import { MarketsController } from './markets.controller';

@Module({
  providers: [MarketsGateway, MarketsService],
  controllers: [MarketsController],
})
export class MarketsModule {}
