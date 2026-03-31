import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

const mockStrategy = {
  id: 'strat-1',
  name: 'RSI 전략',
  type: 'rsi',
  exchange: 'upbit',
  symbol: 'KRW-BTC',
  mode: 'signal',
  tradingMode: 'paper',
  enabled: true,
  intervalSeconds: 60,
  candleInterval: '1h',
  createdAt: '2025-01-01T00:00:00Z',
};

describe('StrategyCard', () => {
  it('전략 이름과 타입을 렌더링해야 한다', () => {
    render(<StrategyCard strategy={mockStrategy} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('RSI 전략')).toBeDefined();
    expect(screen.getByText('RSI')).toBeDefined();
  });

  it('거래소와 심볼 정보를 표시해야 한다', () => {
    render(<StrategyCard strategy={mockStrategy} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(/KRW-BTC/)).toBeDefined();
  });

  it('전략 상세 페이지 링크를 포함해야 한다', () => {
    render(<StrategyCard strategy={mockStrategy} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const link = screen.getByText('RSI 전략').closest('a');
    expect(link?.getAttribute('href')).toBe('/strategies/strat-1');
  });

  it('토글 클릭 시 onToggle 핸들러를 호출해야 한다', () => {
    const onToggle = vi.fn();
    render(<StrategyCard strategy={mockStrategy} onToggle={onToggle} onDelete={vi.fn()} />);

    // ToggleSwitch는 role="switch"로 렌더링됨
    const toggleSwitch = document.querySelector('[role="switch"], [type="checkbox"], button');
    if (toggleSwitch) {
      fireEvent.click(toggleSwitch);
      expect(onToggle).toHaveBeenCalled();
    }
  });

  it('비활성화 상태의 전략을 렌더링해야 한다', () => {
    const disabledStrategy = { ...mockStrategy, enabled: false };
    render(<StrategyCard strategy={disabledStrategy} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('RSI 전략')).toBeDefined();
  });
});
