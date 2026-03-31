import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PnlValue } from './pnl-value';

describe('PnlValue', () => {
  it('양수이면 초록색과 + 부호를 표시해야 한다', () => {
    render(<PnlValue value={50000} />);
    const el = screen.getByText(/50,000/);
    expect(el.className).toContain('green');
    expect(el.textContent).toContain('+');
  });

  it('음수이면 빨간색을 표시해야 한다', () => {
    render(<PnlValue value={-30000} />);
    const el = screen.getByText(/30,000/);
    expect(el.className).toContain('red');
  });

  it('0이면 muted 색상을 표시해야 한다', () => {
    render(<PnlValue value={0} />);
    const el = screen.getByText('0');
    expect(el.className).toContain('muted');
  });

  it('prefix를 표시해야 한다', () => {
    render(<PnlValue value={1000} prefix="₩" />);
    const el = screen.getByText(/₩/);
    expect(el.textContent).toContain('₩');
  });

  it('100만 이상이면 M 단위로 포맷해야 한다', () => {
    render(<PnlValue value={1500000} />);
    expect(screen.getByText(/1\.50M/)).toBeDefined();
  });
});
