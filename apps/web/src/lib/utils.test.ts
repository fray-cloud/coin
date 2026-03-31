import { describe, it, expect } from 'vitest';
import { cn, formatPrice, formatKrw, formatVolume } from './utils';

describe('cn', () => {
  it('클래스 이름을 병합해야 한다', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('Tailwind 충돌을 해결해야 한다', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('조건부 클래스를 처리해야 한다', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });
});

describe('formatPrice', () => {
  it('1000 이상이면 소수점 없이 포맷해야 한다', () => {
    expect(formatPrice('50000000')).toBe('50,000,000');
  });

  it('1~999이면 소수점 2자리까지 포맷해야 한다', () => {
    const result = formatPrice('45.678');
    expect(result).toContain('45');
  });

  it('1 미만이면 소수점 8자리까지 포맷해야 한다', () => {
    const result = formatPrice('0.00001234');
    expect(result).toContain('0.00001234');
  });
});

describe('formatKrw', () => {
  it('100만 이상이면 M 단위로 표시해야 한다', () => {
    expect(formatKrw(1500000)).toBe('1.50M');
  });

  it('100만 미만이면 소수점 없이 표시해야 한다', () => {
    expect(formatKrw(50000)).toBe('50,000');
  });

  it('음수도 처리해야 한다', () => {
    expect(formatKrw(-2000000)).toBe('-2.00M');
  });

  it('0을 처리해야 한다', () => {
    expect(formatKrw(0)).toBe('0');
  });
});

describe('formatVolume', () => {
  it('100만 이상이면 M 단위로 표시해야 한다', () => {
    expect(formatVolume('5000000')).toBe('5.00M');
  });

  it('1000 이상이면 K 단위로 표시해야 한다', () => {
    expect(formatVolume('1500')).toBe('1.50K');
  });

  it('1000 미만이면 소수점 2자리로 표시해야 한다', () => {
    expect(formatVolume('42.5')).toBe('42.50');
  });
});
