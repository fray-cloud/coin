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

  it('portfolioService.getSummary에 위임해야 한다', async () => {
    const summary = { totalValue: 1000, assets: [] };
    mockPortfolioService.getSummary.mockResolvedValue(summary);

    const result = await handler.execute(new GetPortfolioSummaryQuery('user-1', 'paper'));
    expect(result).toEqual(summary);
    expect(mockPortfolioService.getSummary).toHaveBeenCalledWith('user-1', 'paper');
  });

  it('모드가 지정되지 않으면 undefined를 전달해야 한다', async () => {
    mockPortfolioService.getSummary.mockResolvedValue({});

    await handler.execute(new GetPortfolioSummaryQuery('user-1'));
    expect(mockPortfolioService.getSummary).toHaveBeenCalledWith('user-1', undefined);
  });
});
