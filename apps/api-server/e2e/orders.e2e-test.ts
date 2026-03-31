import { describe, it, expect } from 'vitest';
import { api, signupAndLogin } from './helpers';

describe('Orders E2E', () => {
  it('POST /orders → 페이퍼 시장가 주문을 생성해야 한다', async () => {
    const cookies = await signupAndLogin();

    const res = await api('/orders', {
      method: 'POST',
      cookies,
      body: JSON.stringify({
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        side: 'buy',
        type: 'market',
        mode: 'paper',
        quantity: '10000',
      }),
    });

    // 주문 생성 성공 (201) 또는 사가 시작 (200/202)
    expect([200, 201, 202]).toContain(res.status);
  });

  it('GET /orders → 주문 목록을 반환해야 한다', async () => {
    const cookies = await signupAndLogin();

    const res = await api('/orders', { cookies });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
  });

  it('GET /orders → 미인증 시 401을 반환해야 한다', async () => {
    const res = await api('/orders');
    expect(res.status).toBe(401);
  });
});
