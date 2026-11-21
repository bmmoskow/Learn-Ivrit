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

  // Backed by the auth storageState fixture (playwright/.auth/user.json) and the
  // vocabulary the setup project seeds. This proves the authenticated MC path runs
  // on the user's OWN adaptively-selected deck (select_test_words) through the real
  // UI — the scored-save contract (user_tests / test_responses / word_statistics)
  // is pinned at the hook level by useTestPanel.integrationtest.tsx.
  //
  // Mirrors the fixture user's seeded words (tests/setup/auth.setup.ts) so Q1 can
  // be answered correctly and we can assert the deck is really the user's own.
  const SEEDED_WORDS: Record<string, string> = {
    'סֵפֶר': 'book',
    'עֵץ': 'tree',
    'מַיִם': 'water',
    'אֶרֶץ': 'land',
    'שֶׁמֶשׁ': 'sun',
    'יֶלֶד': 'child',
  };

  test('authenticated user completes a scored multiple-choice test and sees results', async ({ page }) => {
    await page.goto('/');
    await navButton(page, 'Test').click();
    await expect(page.getByRole('heading', { name: 'Test Your Knowledge' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Multiple Choice/ }).click();
    await expect(page.getByText('Choose the correct translation:')).toBeVisible({ timeout: 15000 });

    // How many questions the adaptive selection produced from the user's deck.
    const firstCounter = (await page.getByText(/Question 1 of \d+/).textContent({ timeout: 15000 })) ?? '';
    const total = Number(firstCounter.match(/of (\d+)/)?.[1]);
    expect(total, 'the adaptive deck should yield at least one question').toBeGreaterThan(0);

    // Answer EVERY question correctly. The deck is the user's OWN seeded words, so
    // each shown Hebrew maps to a known English; MC auto-advances on answer. Waiting
    // for "Question q of total" at the top of each loop absorbs the advance.
    for (let q = 1; q <= total; q++) {
      await expect(page.getByText(new RegExp(`Question ${q} of ${total}`))).toBeVisible({ timeout: 15000 });
      const hebrew = await currentHebrew(page);
      const english = SEEDED_WORDS[hebrew];
      expect(english, `shown Hebrew "${hebrew}" should be one of the fixture's seeded words`).toBeTruthy();
      await page.getByRole('button', { name: english, exact: true }).click();
    }

    // The scored results screen renders a perfect score over the real adaptive deck,
    // proving the authenticated test ran end to end through the UI. (The persisted
    // save — user_tests / test_responses / word_statistics — is pinned at the hook
    // level by useTestPanel.integrationtest.tsx.)
    await expect(page.getByRole('heading', { name: 'Test Complete!' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('100%')).toBeVisible();
    await expect(page.getByText(`${total} out of ${total} correct`)).toBeVisible();
    await expect(page.getByRole('button', { name: /New Test/i })).toBeVisible();
  });
});
