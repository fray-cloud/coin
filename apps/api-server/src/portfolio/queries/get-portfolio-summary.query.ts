export class GetPortfolioSummaryQuery {
  constructor(
    public readonly userId: string,
    public readonly mode?: 'paper' | 'real' | 'all',
  ) {}
}
