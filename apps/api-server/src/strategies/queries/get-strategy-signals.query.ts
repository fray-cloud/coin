export class GetStrategySignalsQuery {
  constructor(
    public readonly userId: string,
    public readonly strategyId: string,
  ) {}
}
