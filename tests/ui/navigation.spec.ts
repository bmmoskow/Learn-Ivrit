import { test, expect } from '../support/mock-backend';

// UI suite (MOCKED backend): rendering/navigation checks that need a real
// browser but not a real backend.
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // fill-in-later: needs a selector that matches this app's actual nav markup.
  test.fixme('should have main navigation elements', async ({ page }) => {
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav).toBeVisible();
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\//);
    await expect(page).toHaveTitle(/.+/);
  });

  // fill-in-later: needs a selector that matches this app's actual logo/brand.
  test.fixme('should have accessible logo or brand', async ({ page }) => {
    const logo = page.locator('img[alt*="logo" i], a[href="/"]').first();
    await expect(logo).toBeVisible();
  });

  test('should respond to viewport changes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });
});
