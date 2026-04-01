export { CreateFlowCommand } from './create-flow.command';
export { UpdateFlowCommand } from './update-flow.command';
export { DeleteFlowCommand } from './delete-flow.command';
export { ToggleFlowCommand } from './toggle-flow.command';
export { RequestBacktestCommand } from './request-backtest.command';

import { CreateFlowHandler } from './create-flow.handler';
import { UpdateFlowHandler } from './update-flow.handler';
import { DeleteFlowHandler } from './delete-flow.handler';
import { ToggleFlowHandler } from './toggle-flow.handler';
import { RequestBacktestHandler } from './request-backtest.handler';

export const FlowCommandHandlers = [
  CreateFlowHandler,
  UpdateFlowHandler,
  DeleteFlowHandler,
  ToggleFlowHandler,
  RequestBacktestHandler,
];
