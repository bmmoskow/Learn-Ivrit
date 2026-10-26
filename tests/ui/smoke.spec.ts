import { test, expect } from '../support/mock-backend';

// UI-suite smoke (MOCKED backend). Proves the UI harness works end to end: the
// built app boots and renders in a real browser with all backend traffic
// stubbed — deterministic, no real backend required.
test('app boots and renders with a mocked backend', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('body')).toBeVisible();
});
