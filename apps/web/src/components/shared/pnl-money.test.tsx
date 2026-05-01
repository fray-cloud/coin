import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/use-base-currency', () => ({
  useBaseCurrency: () => ({ currency: 'KRW', setCurrency: () => undefined }),
}));
vi.mock('@/hooks/use-exchange-rate', () => ({
  useExchangeRate: () => ({ krwPerUsd: 1300, updatedAt: null, isLoading: false }),
}));

import { PnlMoney } from './pnl-money';

describe('PnlMoney', () => {
  it('양수 USD를 KRW 메인 + USD sub로 + 부호로 표시', () => {
    render(<PnlMoney usd={100} />);
    expect(screen.getByText(/\+/)).toBeInTheDocument();
    expect(screen.getByText(/₩/)).toBeInTheDocument();
    expect(screen.getByText(/\$/)).toBeInTheDocument();
  });

  it('음수는 마이너스 부호 + 빨간 색상 클래스', () => {
    const { container } = render(<PnlMoney usd={-50} />);
    expect(container.querySelector('.text-red-600, .dark\\:text-red-400')).toBeTruthy();
  });

  it('null/undefined는 dash로', () => {
    render(<PnlMoney usd={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
