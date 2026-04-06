export class GetBacktestTraceQuery {
  constructor(
    public readonly userId: string,
    public readonly flowId: string,
    public readonly backtestId: string,
    public readonly from?: string,
    public readonly to?: string,
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}
