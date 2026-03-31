import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIMode } from './use-ui-mode';

describe('useUIMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('기본 모드는 easy이어야 한다', () => {
    const { result } = renderHook(() => useUIMode());
    expect(result.current.mode).toBe('easy');
    expect(result.current.isEasy).toBe(true);
    expect(result.current.isAdvanced).toBe(false);
  });

  it('모드를 advanced로 변경하면 localStorage에 저장해야 한다', () => {
    const { result } = renderHook(() => useUIMode());

    act(() => {
      result.current.setMode('advanced');
    });

    expect(result.current.mode).toBe('advanced');
    expect(result.current.isAdvanced).toBe(true);
    expect(result.current.isEasy).toBe(false);
    expect(localStorage.getItem('uiMode')).toBe('advanced');
  });

  it('localStorage에 저장된 값을 초기 로드해야 한다', () => {
    localStorage.setItem('uiMode', 'advanced');

    const { result } = renderHook(() => useUIMode());
    expect(result.current.mode).toBe('advanced');
  });
});
