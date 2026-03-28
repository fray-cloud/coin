export class GetStrategyLogsQuery {
  constructor(
    public readonly userId: string,
    public readonly strategyId: string,
    public readonly cursor?: string,
    public readonly limit: number = 20,
    public readonly action?: string,
    public readonly signal?: string,
  ) {}
}
