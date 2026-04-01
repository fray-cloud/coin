import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BacktestingService } from './backtesting.service';
import { DataService } from './data.service';
import { OptimizerService } from './optimizer.service';
import { WalkForwardService } from './walk-forward.service';
import { MonteCarloService } from './monte-carlo.service';

@Module({
  imports: [PrismaModule],
  providers: [
    BacktestingService,
    DataService,
    OptimizerService,
    WalkForwardService,
    MonteCarloService,
  ],
  exports: [BacktestingService],
})
export class BacktestingModule {}
