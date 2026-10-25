import { test, expect } from '@playwright/test';

// Harness-validation smoke. Deliberately backend-light and DOM-agnostic so it
// is deterministic: it proves the Playwright infrastructure works end to end —
// the production build serves, boots in a real browser, and renders. This is
// the one spec CI runs while the infrastructure is being established.
//
// The richer journeys (e2e/login.spec.ts, navigation.spec.ts,
// vocabulary.spec.ts) are the "fill in later" work: they need DOM-accurate
// selectors and, for the authenticated flows, seeded test users. Enable them in
// CI (and gate promotion on them) as they're hardened.
test('app boots and renders in a real browser', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  await expect(page.locator('body')).toBeVisible();
});
