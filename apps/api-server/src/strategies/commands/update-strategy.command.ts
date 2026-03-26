import { UpdateStrategyDto } from '../dto/update-strategy.dto';

export class UpdateStrategyCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
    public readonly dto: UpdateStrategyDto,
  ) {}
}
