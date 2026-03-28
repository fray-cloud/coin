import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PortfolioService } from '../portfolio.service';
import { GetPortfolioSummaryQuery } from './get-portfolio-summary.query';

@QueryHandler(GetPortfolioSummaryQuery)
export class GetPortfolioSummaryHandler implements IQueryHandler<GetPortfolioSummaryQuery> {
  constructor(private readonly portfolioService: PortfolioService) {}

  async execute(query: GetPortfolioSummaryQuery): Promise<unknown> {
    return this.portfolioService.getSummary(query.userId, query.mode);
  }
}
