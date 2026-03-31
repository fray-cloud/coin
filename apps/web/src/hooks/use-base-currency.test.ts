import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBaseCurrency } from './use-base-currency';

describe('useBaseCurrency', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('기본값은 KRW이어야 한다', () => {
    const { result } = renderHook(() => useBaseCurrency());
    expect(result.current.currency).toBe('KRW');
  });

  it('통화를 USD로 변경하면 localStorage에 저장해야 한다', () => {
    const { result } = renderHook(() => useBaseCurrency());

    act(() => {
      result.current.setCurrency('USD');
    });

    expect(result.current.currency).toBe('USD');
    expect(localStorage.getItem('baseCurrency')).toBe('USD');
  });

  it('localStorage에 저장된 값을 초기 로드해야 한다', () => {
    localStorage.setItem('baseCurrency', 'USD');

    const { result } = renderHook(() => useBaseCurrency());
    // useEffect로 로드되므로 초기값은 KRW, 이후 USD로 업데이트
    expect(result.current.currency).toBe('USD');
  });
});
