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

  it('네트워크 필터를 PortfolioService에 위임한다', async () => {
    mockPortfolioService.getSummary.mockResolvedValue({ network: 'testnet' });

    await handler.execute(new GetPortfolioSummaryQuery('user-1', 'testnet'));
    expect(mockPortfolioService.getSummary).toHaveBeenCalledWith('user-1', 'testnet');
  });

  it('네트워크가 지정되지 않으면 undefined를 전달한다', async () => {
    mockPortfolioService.getSummary.mockResolvedValue({});
    await handler.execute(new GetPortfolioSummaryQuery('user-1'));
    expect(mockPortfolioService.getSummary).toHaveBeenCalledWith('user-1', undefined);
  });
});
