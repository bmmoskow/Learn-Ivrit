import { test, expect } from '@playwright/test';

// E2E suite (REAL backend). Fill-in-later: the authenticated flows need seeded
// test users and an auth storageState setup (playwright/.auth/user.json);
// those are kept skipped until that fixture exists.
test.describe('Vocabulary Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // fill-in-later: confirm the app's real unauth behavior (redirect vs guest mode).
  test.fixme('should require authentication for vocabulary access', async ({ page }) => {
    await page.goto('/vocabulary');
    await expect(page).toHaveURL(/login|signin|auth/i, { timeout: 5000 });
  });

  // fill-in-later: needs a seeded test user in the sandbox/test project.
  test.fixme('authenticated user can access vocabulary page', async ({ page }) => {
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword123';

    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard|vocabulary|home/i, { timeout: 10000 });
    await expect(page).not.toHaveURL(/login|signin|auth/i);
  });
});

test.describe('Vocabulary Features (Authenticated)', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test.skip('should display vocabulary list', async ({ page }) => {
    await page.goto('/vocabulary');
    const vocabularyList = page.locator('[data-testid="vocabulary-list"], table, .vocabulary-item').first();
    await expect(vocabularyList).toBeVisible({ timeout: 10000 });
  });

  test.skip('should allow adding new vocabulary', async ({ page }) => {
    await page.goto('/vocabulary');
    const addButton = page.locator('button').filter({ hasText: /add|new|create/i }).first();
    await addButton.click();

    const hebrewInput = page.locator('input[name*="hebrew" i], input[placeholder*="hebrew" i]').first();
    const englishInput = page.locator('input[name*="english" i], input[placeholder*="english" i]').first();

    await hebrewInput.fill('שָׁלוֹם');
    await englishInput.fill('peace');

    const saveButton = page.locator('button[type="submit"], button').filter({ hasText: /save|add|create/i }).first();
    await saveButton.click();

    await expect(page.locator('text="שָׁלוֹם"')).toBeVisible({ timeout: 5000 });
  });
});
