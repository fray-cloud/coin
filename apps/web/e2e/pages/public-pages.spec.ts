import { test, expect } from 'playwright/test';

test.describe('공개 페이지', () => {
  test('홈페이지가 렌더링되어야 한다', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/coin/i);
  });

  test('로그인 페이지에 이메일/비밀번호 폼이 표시되어야 한다', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호')).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('회원가입 페이지에 폼이 표시되어야 한다', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
  });

  test('마켓 페이지가 렌더링되어야 한다', async ({ page }) => {
    await page.goto('/markets');
    await expect(page).toHaveURL(/\/markets/);
  });
});
