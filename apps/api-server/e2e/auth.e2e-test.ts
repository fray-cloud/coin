import { describe, it, expect } from 'vitest';
import { api, extractCookies, uniqueEmail } from './helpers';

describe('Auth E2E', () => {
  const password = 'TestPass123!';
  let testEmail: string;
  let authCookies: string;

  it('POST /auth/signup → 회원가입 후 쿠키에 토큰을 설정해야 한다', async () => {
    testEmail = uniqueEmail();
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password }),
    });

    expect(res.status).toBe(201);
    authCookies = extractCookies(res);
    expect(authCookies).toContain('access_token');
    expect(authCookies).toContain('refresh_token');

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.email).toBe(testEmail);
  });

  it('GET /auth/me → 인증된 사용자 정보를 반환해야 한다', async () => {
    const res = await api('/auth/me', { cookies: authCookies });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.email).toBe(testEmail);
  });

  it('GET /auth/me → 미인증 시 401을 반환해야 한다', async () => {
    const res = await api('/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh → 토큰을 갱신해야 한다', async () => {
    const res = await api('/auth/refresh', {
      method: 'POST',
      cookies: authCookies,
    });

    expect(res.status).toBe(200);
    const newCookies = extractCookies(res);
    expect(newCookies).toContain('access_token');
    // 갱신된 쿠키로 업데이트
    authCookies = newCookies;
  });

  it('POST /auth/logout → 쿠키를 제거해야 한다', async () => {
    const res = await api('/auth/logout', {
      method: 'POST',
      cookies: authCookies,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toBe('Logged out');
  });

  it('POST /auth/login → 유효한 자격증명으로 로그인해야 한다', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password }),
    });

    expect(res.status).toBe(200);
    const cookies = extractCookies(res);
    expect(cookies).toContain('access_token');

    const body = await res.json();
    expect(body.email).toBe(testEmail);
  });

  it('POST /auth/login → 잘못된 비밀번호는 401을 반환해야 한다', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: 'wrong' }),
    });

    expect(res.status).toBe(401);
  });

  it('POST /auth/signup → 중복 이메일은 에러를 반환해야 한다', async () => {
    const res = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password }),
    });

    expect(res.status).toBe(409);
  });
});
