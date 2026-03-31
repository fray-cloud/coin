import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToastStore } from './use-toast-store';

describe('useToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('토스트를 추가해야 한다', () => {
    useToastStore.getState().addToast({ type: 'success', title: '성공', message: '주문 완료' });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].title).toBe('성공');
    expect(toasts[0].id).toBeDefined();
  });

  it('5초 후 토스트를 자동 제거해야 한다', () => {
    useToastStore.getState().addToast({ type: 'info', title: '알림', message: '테스트' });
    expect(useToastStore.getState().toasts).toHaveLength(1);

    vi.advanceTimersByTime(5000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('수동으로 토스트를 제거해야 한다', () => {
    useToastStore.getState().addToast({ type: 'error', title: '에러', message: '실패' });
    const id = useToastStore.getState().toasts[0].id;

    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('여러 토스트를 동시에 관리해야 한다', () => {
    useToastStore.getState().addToast({ type: 'success', title: '1', message: 'a' });
    useToastStore.getState().addToast({ type: 'error', title: '2', message: 'b' });

    expect(useToastStore.getState().toasts).toHaveLength(2);

    // 첫 번째 토스트만 제거
    const firstId = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(firstId);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].title).toBe('2');
  });
});
