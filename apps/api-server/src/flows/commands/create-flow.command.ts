import type { CreateFlowDto } from '../dto/create-flow.dto';

export class CreateFlowCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: CreateFlowDto,
  ) {}
}
