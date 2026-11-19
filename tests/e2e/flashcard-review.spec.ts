import { test, expect } from '@playwright/test';

// E2E suite (REAL backend). The guest flashcard-review flow is fully
// deterministic end to end: the guest deck is the curated default list, built
// client-side with no backend writes, so it exercises the real built app and
// real browser without needing a seeded user. The authenticated flow is kept as
// fill-in-later, matching vocabulary.spec.ts, until the auth storageState
// fixture (playwright/.auth/user.json) exists.

const navButton = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();

test.describe('Flashcard review (guest)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('guestMode', 'true');
      } catch {
        /* storage unavailable */
      }
    });
    await page.goto('/');
    await navButton(page, 'Vocabulary').click();
    await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible({ timeout: 15000 });
  });

  test('guest can open review, flip a card, advance, and exit', async ({ page }) => {
    await page.getByRole('button', { name: 'Flashcards', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Flashcard Review' })).toBeVisible({ timeout: 15000 });

    // A real, non-empty deck renders.
    await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();

    // Flip the card.
    await page.getByRole('button', { name: 'Show Translation' }).click();
    await expect(page.getByRole('button', { name: 'Hide Translation' })).toBeVisible();

    // Advance — the next card comes up face-down.
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(/Card 2 of \d+/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show Translation' })).toBeVisible();

    // Leave review and return to the list.
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible();
  });
});

test.describe('Flashcard review (authenticated)', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  // fill-in-later: needs a seeded test user + auth storageState in the sandbox /
  // test project. The hook then drills the user's own adaptively-selected words
  // via select_test_words — assert the real deck loads and that reviewing writes
  // nothing to user_tests / word_statistics (the integration test proves the
  // no-write contract at the hook level today).
  test.fixme('authenticated user drills their adaptively-selected words', async ({ page }) => {
    await page.goto('/');
    await navButton(page, 'Vocabulary').click();
    await page.getByRole('button', { name: 'Flashcards', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Flashcard Review' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();
  });
});
