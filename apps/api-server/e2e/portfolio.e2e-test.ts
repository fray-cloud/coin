import { describe, it, expect } from 'vitest';
import { api, signupAndLogin } from './helpers';

describe('Portfolio E2E', () => {
  it('GET /portfolio/summary → 포트폴리오 요약을 반환해야 한다', async () => {
    const cookies = await signupAndLogin();

    const res = await api('/portfolio/summary', { cookies });
    expect(res.status).toBe(200);
  });

  it('GET /portfolio/summary?mode=paper → 페이퍼 모드 포트폴리오를 반환해야 한다', async () => {
    const cookies = await signupAndLogin();

    const res = await api('/portfolio/summary?mode=paper', { cookies });
    expect(res.status).toBe(200);
  });

  it('GET /portfolio/summary → 미인증 시 401을 반환해야 한다', async () => {
    const res = await api('/portfolio/summary');
    expect(res.status).toBe(401);
  });
});
