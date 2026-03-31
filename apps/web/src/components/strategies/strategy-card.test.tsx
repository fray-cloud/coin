import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createMockStrategy } from '@coin/test-utils';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock components that use complex dependencies
vi.mock('@/components/mini-chart', () => ({
  MiniChart: () => <div data-testid="mini-chart" />,
}));

import { StrategyCard } from './strategy-card';

const strategy = {
  ...createMockStrategy({ name: 'RSI 전략', type: 'rsi', exchange: 'upbit', symbol: 'KRW-BTC' }),
  id: 'strat-1',
  enabled: true,
  mode: 'signal',
  tradingMode: 'paper',
  intervalSeconds: 60,
  candleInterval: '1h',
  createdAt: '2025-01-01T00:00:00Z',
};

describe('StrategyCard', () => {
  it('전략 이름과 타입을 렌더링해야 한다', () => {
    render(<StrategyCard strategy={strategy} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('RSI 전략')).toBeInTheDocument();
    expect(screen.getByText('RSI')).toBeInTheDocument();
  });

  it('거래소와 심볼 정보를 표시해야 한다', () => {
    render(<StrategyCard strategy={strategy} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(/KRW-BTC/)).toBeInTheDocument();
  });

  it('전략 상세 페이지 링크를 포함해야 한다', () => {
    render(<StrategyCard strategy={strategy} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const link = screen.getByRole('link', { name: /RSI 전략/ });
    expect(link).toHaveAttribute('href', '/strategies/strat-1');
  });

  it('토글 클릭 시 onToggle 핸들러를 호출해야 한다', () => {
    const onToggle = vi.fn();
    render(<StrategyCard strategy={strategy} onToggle={onToggle} onDelete={vi.fn()} />);

    const toggleSwitch = screen.getByRole('switch');
    fireEvent.click(toggleSwitch);
    expect(onToggle).toHaveBeenCalled();
  });

  it('비활성화 상태의 전략을 렌더링해야 한다', () => {
    const disabledStrategy = { ...strategy, enabled: false };
    render(<StrategyCard strategy={disabledStrategy} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('RSI 전략')).toBeInTheDocument();
  });
});
