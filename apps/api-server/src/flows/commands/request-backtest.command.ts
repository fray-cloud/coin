import type { BacktestRequestDto } from '../dto/backtest-request.dto';

export class RequestBacktestCommand {
  constructor(
    public readonly userId: string,
    public readonly flowId: string,
    public readonly dto: BacktestRequestDto,
  ) {}
}
