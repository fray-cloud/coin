import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const mockState = { currency: 'KRW' as 'KRW' | 'USD', krwPerUsd: 1300 };

vi.mock('@/hooks/use-base-currency', () => ({
  useBaseCurrency: () => ({ currency: mockState.currency, setCurrency: () => undefined }),
}));
vi.mock('@/hooks/use-exchange-rate', () => ({
  useExchangeRate: () => ({ krwPerUsd: mockState.krwPerUsd, updatedAt: null, isLoading: false }),
}));

import { MoneyValue } from './money-value';

describe('MoneyValue', () => {
  it('KRW 모드: ₩ 메인 + $ 서브', () => {
    mockState.currency = 'KRW';
    mockState.krwPerUsd = 1300;
    render(<MoneyValue usd={100} />);
    expect(screen.getByText(/₩/)).toBeInTheDocument();
    expect(screen.getByText(/\$/)).toBeInTheDocument();
  });

  it('USD 모드: $ 메인 + ₩ 서브', () => {
    cleanup();
    mockState.currency = 'USD';
    mockState.krwPerUsd = 1300;
    render(<MoneyValue usd={100} />);
    expect(screen.getByText(/\$/)).toBeInTheDocument();
    expect(screen.getByText(/₩/)).toBeInTheDocument();
  });

  it('환율 0: USD만 (서브 없음)', () => {
    cleanup();
    mockState.currency = 'KRW';
    mockState.krwPerUsd = 0;
    render(<MoneyValue usd={100} />);
    expect(screen.queryByText(/₩/)).not.toBeInTheDocument();
    expect(screen.getByText(/\$/)).toBeInTheDocument();
  });

  it('null은 dash', () => {
    cleanup();
    render(<MoneyValue usd={null} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
