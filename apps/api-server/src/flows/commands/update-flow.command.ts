import type { UpdateFlowDto } from '../dto/update-flow.dto';

export class UpdateFlowCommand {
  constructor(
    public readonly userId: string,
    public readonly id: string,
    public readonly dto: UpdateFlowDto,
  ) {}
}
