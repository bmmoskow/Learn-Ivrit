import { test, expect, type Page } from '@playwright/test';
import { defaultVocabulary } from '../../src/data/defaultVocabulary';

// E2E suite (REAL backend) for the TestPanel's objective test types. The GUEST
// flows are fully deterministic end to end: the guest deck is the curated
// default list, built client-side with NO backend writes, so they exercise the
// real built app and real browser without needing a seeded user. The
// authenticated flow (which does persist to user_tests / test_responses /
// word_statistics) is kept as fill-in-later, matching vocabulary.spec.ts /
// flashcard-review.spec.ts, until the auth storageState fixture
// (playwright/.auth/user.json) exists.

const navButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();

const GUEST_MAP: Record<string, string> = Object.fromEntries(
  defaultVocabulary.map((w) => [w.hebrew, w.english]),
);

async function currentHebrew(page: Page): Promise<string> {
  return ((await page.locator('[dir="rtl"]').first().textContent()) ?? '').trim();
}

test.describe('TestPanel (guest)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('guestMode', 'true');
      } catch {
        /* storage unavailable */
      }
    });
    await page.goto('/');
    await navButton(page, 'Test').click();
    await expect(page.getByRole('heading', { name: 'Test Your Knowledge' })).toBeVisible({ timeout: 15000 });
  });

  test('guest can start a multiple choice test, answer, progress, and exit', async ({ page }) => {
    await page.getByRole('button', { name: /Multiple Choice/ }).click();

    await expect(page.getByText(/Question 1 of \d+/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Choose the correct translation:')).toBeVisible();

    // The guest deck offers only the correct option — click it by its English.
    await page.getByRole('button', { name: GUEST_MAP[await currentHebrew(page)], exact: true }).click();

    // The test advances to the next question.
    await expect(page.getByText(/Question 2 of \d+/)).toBeVisible({ timeout: 15000 });

    // Exit back to the vocabulary list (guests have no mid-test exit button).
    await navButton(page, 'Vocabulary').click();
    await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible({ timeout: 15000 });
  });

  test('guest can start a fill-in-the-blank test, see feedback, progress, and exit', async ({ page }) => {
    await page.getByRole('button', { name: /Fill in the Blank/ }).click();

    await expect(page.getByText(/Question 1 of \d+/)).toBeVisible({ timeout: 15000 });

    // A deliberately wrong answer is graded wrong and reveals the correct one.
    await page.getByPlaceholder('Type your answer...').fill('definitely-not-a-word');
    await page.getByRole('button', { name: 'Submit Answer' }).click();
    await expect(page.getByText('Incorrect')).toBeVisible();
    await expect(page.getByText(/Correct answer:/)).toBeVisible();

    // The test advances to the next question face-down.
    await expect(page.getByText(/Question 2 of \d+/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByPlaceholder('Type your answer...')).toBeVisible();

    await navButton(page, 'Vocabulary').click();
    await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible({ timeout: 15000 });
  });
});

test.describe('TestPanel (authenticated)', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  // fill-in-later: needs a seeded test user + auth storageState in the sandbox /
  // test project. The authed path persists a completed test via
  // save_complete_test_results (user_tests / test_responses / word_statistics) —
  // the hook-level integration tests prove that contract today; this asserts it
  // end to end through the real UI once the fixture exists.
  test.fixme('authenticated user completes a scored test and sees results', async ({ page }) => {
    await page.goto('/');
    await navButton(page, 'Test').click();
    await expect(page.getByRole('heading', { name: 'Test Your Knowledge' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Multiple Choice/ }).click();
    await expect(page.getByText(/Question 1 of \d+/)).toBeVisible({ timeout: 15000 });
  });
});
