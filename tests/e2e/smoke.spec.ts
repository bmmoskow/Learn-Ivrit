import { test, expect } from '@playwright/test';

// E2E-suite smoke (REAL backend). Proves the E2E harness works end to end: the
// app — built against the real backend (local Docker sandbox when run locally,
// the TEST Supabase project in CI) — boots and renders in a real browser.
test('app boots and renders against the real backend', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('body')).toBeVisible();
});
