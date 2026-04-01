import { CreateStrategyHandler } from './create-strategy.handler';
import { UpdateStrategyHandler } from './update-strategy.handler';
import { ToggleStrategyHandler } from './toggle-strategy.handler';
import { DeleteStrategyHandler } from './delete-strategy.handler';
import { ReorderStrategiesHandler } from './reorder-strategies.handler';

export const StrategyCommandHandlers = [
  CreateStrategyHandler,
  UpdateStrategyHandler,
  ToggleStrategyHandler,
  DeleteStrategyHandler,
  ReorderStrategiesHandler,
];

export { CreateStrategyCommand } from './create-strategy.command';
export { UpdateStrategyCommand } from './update-strategy.command';
export { ToggleStrategyCommand } from './toggle-strategy.command';
export { DeleteStrategyCommand } from './delete-strategy.command';
export { ReorderStrategiesCommand } from './reorder-strategies.command';
