import { ReorderStrategiesDto } from '../dto/reorder-strategies.dto';

export class ReorderStrategiesCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: ReorderStrategiesDto,
  ) {}
}
