import { Module } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
import { RiskService } from './risk/risk.service';

@Module({
  providers: [StrategiesService, RiskService],
  exports: [StrategiesService],
})
export class StrategiesModule {}
