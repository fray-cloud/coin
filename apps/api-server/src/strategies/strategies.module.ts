import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StrategiesController } from './strategies.controller';
import { StrategyCommandHandlers } from './commands';
import { StrategyQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [StrategiesController],
  providers: [...StrategyCommandHandlers, ...StrategyQueryHandlers],
})
export class StrategiesModule {}
