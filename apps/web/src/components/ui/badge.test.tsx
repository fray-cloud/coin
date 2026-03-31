import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('텍스트를 렌더링해야 한다', () => {
    render(<Badge>RSI</Badge>);
    expect(screen.getByText('RSI')).toBeDefined();
  });

  it('기본 variant를 적용해야 한다', () => {
    render(<Badge>테스트</Badge>);
    const badge = screen.getByText('테스트');
    expect(badge.className).toContain('bg-primary');
  });

  it('success variant를 적용해야 한다', () => {
    render(<Badge variant="success">성공</Badge>);
    const badge = screen.getByText('성공');
    expect(badge.className).toContain('green');
  });

  it('error variant를 적용해야 한다', () => {
    render(<Badge variant="error">실패</Badge>);
    const badge = screen.getByText('실패');
    expect(badge.className).toContain('red');
  });

  it('커스텀 className을 병합해야 한다', () => {
    render(<Badge className="ml-2">커스텀</Badge>);
    const badge = screen.getByText('커스텀');
    expect(badge.className).toContain('ml-2');
  });
});
