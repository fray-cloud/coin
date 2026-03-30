import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetPortfolioSummaryHandler } from './get-portfolio-summary.handler';
import { GetPortfolioSummaryQuery } from './get-portfolio-summary.query';

const mockPortfolioService = { getSummary: vi.fn() };

describe('GetPortfolioSummaryHandler', () => {
  let handler: GetPortfolioSummaryHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    handler = new GetPortfolioSummaryHandler(mockPortfolioService as never);
  });

  it('should delegate to portfolioService.getSummary', async () => {
    const summary = { totalValue: 1000, assets: [] };
    mockPortfolioService.getSummary.mockResolvedValue(summary);

    const result = await handler.execute(new GetPortfolioSummaryQuery('user-1', 'paper'));
    expect(result).toEqual(summary);
    expect(mockPortfolioService.getSummary).toHaveBeenCalledWith('user-1', 'paper');
  });

  it('should pass mode "all" when not specified', async () => {
    mockPortfolioService.getSummary.mockResolvedValue({});

    await handler.execute(new GetPortfolioSummaryQuery('user-1'));
    expect(mockPortfolioService.getSummary).toHaveBeenCalledWith('user-1', undefined);
  });
});
