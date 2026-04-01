import { Module } from '@nestjs/common';
import { FlowsService } from './flows.service';
import { RiskService } from '../strategies/risk/risk.service';

@Module({
  providers: [FlowsService, RiskService],
  exports: [FlowsService],
})
export class FlowsModule {}
