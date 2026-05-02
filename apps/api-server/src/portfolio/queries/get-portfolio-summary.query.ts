export type PortfolioNetwork = 'testnet' | 'mainnet' | 'all';

export class GetPortfolioSummaryQuery {
  constructor(
    public readonly userId: string,
    public readonly network?: PortfolioNetwork,
  ) {}
}
