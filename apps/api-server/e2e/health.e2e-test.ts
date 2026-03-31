import { describe, it, expect } from 'vitest';
import { api } from './helpers';

describe('Health E2E', () => {
  it('GET /health — 서비스 상태를 반환해야 한다', async () => {
    const res = await api('/health');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('api-server');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /ready — DB 연결 상태를 확인해야 한다', async () => {
    const res = await api('/ready');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.details.database.status).toBe('up');
  });
});
