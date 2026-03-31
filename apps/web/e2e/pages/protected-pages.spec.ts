import { test, expect } from 'playwright/test';

test.describe('인증 필요 페이지 리다이렉트', () => {
  test('주문 페이지 접근 시 로그인으로 리다이렉트해야 한다', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login/);
  });

  test('전략 페이지 접근 시 로그인으로 리다이렉트해야 한다', async ({ page }) => {
    await page.goto('/strategies');
    await expect(page).toHaveURL(/\/login/);
  });

  test('포트폴리오 페이지 접근 시 로그인으로 리다이렉트해야 한다', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page).toHaveURL(/\/login/);
  });

  test('계정 관리 페이지 접근 시 로그인으로 리다이렉트해야 한다', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/login/);
  });

  test('설정 페이지 접근 시 로그인으로 리다이렉트해야 한다', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });

  test('활동 로그 페이지 접근 시 로그인으로 리다이렉트해야 한다', async ({ page }) => {
    await page.goto('/activity');
    await expect(page).toHaveURL(/\/login/);
  });

  test('알림 설정 페이지 접근 시 로그인으로 리다이렉트해야 한다', async ({ page }) => {
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/login/);
  });
});
