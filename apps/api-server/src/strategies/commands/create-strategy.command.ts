import { CreateStrategyDto } from '../dto/create-strategy.dto';

export class CreateStrategyCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: CreateStrategyDto,
  ) {}
}
