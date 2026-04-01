export { GetFlowsQuery } from './get-flows.query';
export { GetFlowQuery } from './get-flow.query';
export { GetBacktestsQuery } from './get-backtests.query';
export { GetBacktestTraceQuery } from './get-backtest-trace.query';

import { GetFlowsHandler } from './get-flows.handler';
import { GetFlowHandler } from './get-flow.handler';
import { GetBacktestsHandler } from './get-backtests.handler';
import { GetBacktestTraceHandler } from './get-backtest-trace.handler';

export const FlowQueryHandlers = [
  GetFlowsHandler,
  GetFlowHandler,
  GetBacktestsHandler,
  GetBacktestTraceHandler,
];
