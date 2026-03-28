import { GetStrategiesHandler } from './get-strategies.handler';
import { GetStrategyHandler } from './get-strategy.handler';
import { GetStrategyLogsHandler } from './get-strategy-logs.handler';
import { GetStrategyPerformanceHandler } from './get-strategy-performance.handler';
import { GetStrategySignalsHandler } from './get-strategy-signals.handler';

export const StrategyQueryHandlers = [
  GetStrategiesHandler,
  GetStrategyHandler,
  GetStrategyLogsHandler,
  GetStrategyPerformanceHandler,
  GetStrategySignalsHandler,
];

export { GetStrategiesQuery } from './get-strategies.query';
export { GetStrategyQuery } from './get-strategy.query';
export { GetStrategyLogsQuery } from './get-strategy-logs.query';
export { GetStrategyPerformanceQuery } from './get-strategy-performance.query';
export { GetStrategySignalsQuery } from './get-strategy-signals.query';
