import { Module } from '@nestjs/common';
import { BacktestsService } from './backtests.service';

@Module({
  providers: [BacktestsService],
  exports: [BacktestsService],
})
export class BacktestsModule {}
