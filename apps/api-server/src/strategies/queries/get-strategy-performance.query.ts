export class GetStrategyPerformanceQuery {
  constructor(
    public readonly userId: string,
    public readonly strategyId: string,
  ) {}
}
