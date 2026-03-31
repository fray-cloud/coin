import { describe, it, expect } from 'vitest';
import { api, signupAndLogin } from './helpers';

describe('Strategies E2E', () => {
  it('POST /strategies → 페이퍼 전략을 생성해야 한다', async () => {
    const cookies = await signupAndLogin();

    const res = await api('/strategies', {
      method: 'POST',
      cookies,
      body: JSON.stringify({
        name: 'E2E RSI 전략',
        type: 'rsi',
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        mode: 'signal',
        tradingMode: 'paper',
        config: { period: 14, overbought: 70, oversold: 30 },
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.name).toBe('E2E RSI 전략');
  });

  it('GET /strategies → 전략 목록을 반환해야 한다', async () => {
    const cookies = await signupAndLogin();

    const res = await api('/strategies', { cookies });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('전략 CRUD 전체 플로우', async () => {
    const cookies = await signupAndLogin();

    // Create
    const createRes = await api('/strategies', {
      method: 'POST',
      cookies,
      body: JSON.stringify({
        name: 'CRUD 테스트',
        type: 'macd',
        exchange: 'upbit',
        symbol: 'KRW-BTC',
        mode: 'signal',
        tradingMode: 'paper',
        config: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      }),
    });
    expect(createRes.status).toBe(201);
    const { id } = await createRes.json();

    // Read
    const getRes = await api(`/strategies/${id}`, { cookies });
    expect(getRes.status).toBe(200);
    const strategy = await getRes.json();
    expect(strategy.name).toBe('CRUD 테스트');

    // Update
    const updateRes = await api(`/strategies/${id}`, {
      method: 'PATCH',
      cookies,
      body: JSON.stringify({ name: '수정된 전략' }),
    });
    expect(updateRes.status).toBe(200);

    // Toggle
    const toggleRes = await api(`/strategies/${id}/toggle`, {
      method: 'PATCH',
      cookies,
    });
    expect(toggleRes.status).toBe(200);
    const toggled = await toggleRes.json();
    expect(toggled.enabled).toBe(true);

    // Delete
    const deleteRes = await api(`/strategies/${id}`, {
      method: 'DELETE',
      cookies,
    });
    expect(deleteRes.status).toBe(200);

    // Verify deleted
    const verifyRes = await api(`/strategies/${id}`, { cookies });
    expect(verifyRes.status).toBe(404);
  });

  it('GET /strategies → 미인증 시 401을 반환해야 한다', async () => {
    const res = await api('/strategies');
    expect(res.status).toBe(401);
  });
});
