import { test, expect } from 'playwright/test';

test.describe('인증 플로우', () => {
  test('로그인 페이지에서 회원가입 링크로 이동할 수 있어야 한다', async ({ page }) => {
    await page.goto('/login');
    // main 영역의 회원가입 링크 클릭 (nav에도 동일 링크 존재)
    await page.getByRole('main').getByRole('link', { name: '회원가입' }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('회원가입 페이지에서 로그인 링크로 이동할 수 있어야 한다', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('main').getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('빈 폼으로 로그인 시도 시 페이지가 유지되어야 한다', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('회원가입에서 비밀번호 불일치 시 페이지가 유지되어야 한다', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel('이메일').fill('test@test.com');
    await page.getByLabel('비밀번호', { exact: true }).fill('password123');
    await page.getByLabel('비밀번호 확인').fill('different456');

    await page.getByRole('button', { name: '계정 생성' }).click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('회원가입 → 로그인 전체 플로우', async ({ page }) => {
    const email = `e2e-${Date.now()}@test.com`;
    const password = 'TestPass123!';

    // 회원가입
    await page.goto('/signup');
    await page.getByLabel('이메일').fill(email);
    await page.getByLabel('비밀번호', { exact: true }).fill(password);
    await page.getByLabel('비밀번호 확인').fill(password);
    await page.getByRole('button', { name: '계정 생성' }).click();

    // 로그인 페이지로 리다이렉트 또는 자동 로그인
    await page.waitForURL(/\/(login|markets)/, { timeout: 10000 });

    // 로그인
    if (page.url().includes('/login')) {
      await page.getByLabel('이메일').fill(email);
      await page.getByLabel('비밀번호').fill(password);
      await page.getByRole('button', { name: '로그인' }).click();
      await page.waitForURL(/\/markets/, { timeout: 10000 });
    }

    // 로그인 후 보호된 페이지 접근 가능
    await page.goto('/orders');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
