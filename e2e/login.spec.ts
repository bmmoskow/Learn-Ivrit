import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /login|sign in/i })).toBeVisible();
  });

  test('should show email and password inputs', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/invalid|error|failed/i')).toBeVisible({ timeout: 5000 });
  });

  test('should have sign up link', async ({ page }) => {
    const signUpLink = page.locator('a, button').filter({ hasText: /sign up|register|create account/i });
    await expect(signUpLink).toBeVisible();
  });

  test('should have password reset link', async ({ page }) => {
    const resetLink = page.locator('a, button').filter({ hasText: /forgot|reset/i });
    await expect(resetLink).toBeVisible();
  });
});
