export class GetStrategyLogsQuery {
  constructor(
    public readonly userId: string,
    public readonly strategyId: string,
    public readonly cursor?: string,
    public readonly limit: number = 20,
  ) {}
}
