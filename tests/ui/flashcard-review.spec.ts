import { test, expect, type Page } from '../support/mock-backend';
import type { Route } from '@playwright/test';

// UI suite (MOCKED backend) for the Vocabulary flashcard review. Real browser,
// no real backend. Flashcard review is practice-only: it drills the user's
// weakest words but is NEVER scored, and it is reachable by guests and authed
// users alike. Two worlds, matching the Vocabulary spec:
//   • GUEST  — localStorage `guestMode`, in-memory default deck, entirely
//              client-side (no backend touched at all).
//   • AUTHED — a faked Supabase session plus a route-mocked `select_test_words`
//              RPC, so we can drive a deterministic deck.
// The through-line of both worlds: revealing/advancing a card issues no write,
// and there is no self-grading UI anywhere — that moved to the real tests.

const navButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();

async function gotoVocabulary(page: Page) {
  await navButton(page, 'Vocabulary').click();
  await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible({ timeout: 15000 });
}

async function openReview(page: Page) {
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Flashcard Review' })).toBeVisible({ timeout: 15000 });
}

// Labels a self-grading flow would use. Review must expose none of them — the
// guard against regressions that re-introduce scoring into practice.
const SCORING_LABELS = /correct|incorrect|i knew|didn'?t know|got it|right|wrong|grade|score/i;

async function expectNoScoringUI(page: Page) {
  await expect(page.getByRole('button', { name: SCORING_LABELS })).toHaveCount(0);
}

// ---------------------------------------------------------------------------
// GUEST
// ---------------------------------------------------------------------------
test.describe('Flashcard review — guest mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('guestMode', 'true');
      } catch {
        /* storage unavailable */
      }
    });
    await page.goto('/');
    await gotoVocabulary(page);
  });

  test('opens review from the list header with a non-empty deck', async ({ page }) => {
    await openReview(page);
    // Default deck is the curated sample list, so the first card is present.
    await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();
    await expectNoScoringUI(page);
  });

  test('reveals and re-hides the translation without advancing', async ({ page }) => {
    await openReview(page);

    // Face down: the prompt is shown and the reveal action is available.
    await expect(page.getByText(/to reveal/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show Translation' })).toBeVisible();

    await page.getByRole('button', { name: 'Show Translation' }).click();

    // Face up: the toggle flips and the prompt is gone — still on card 1.
    await expect(page.getByRole('button', { name: 'Hide Translation' })).toBeVisible();
    await expect(page.getByText(/to reveal/)).toHaveCount(0);
    await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();

    await page.getByRole('button', { name: 'Hide Translation' }).click();
    await expect(page.getByRole('button', { name: 'Show Translation' })).toBeVisible();
    await expect(page.getByText(/to reveal/)).toBeVisible();
  });

  test('advances and steps back through the deck, re-hiding each card', async ({ page }) => {
    await openReview(page);
    await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();

    await page.getByRole('button', { name: 'Show Translation' }).click();
    await expect(page.getByRole('button', { name: 'Hide Translation' })).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    // Advancing lands face-down on card 2 (the reveal toggle resets).
    await expect(page.getByText(/Card 2 of \d+/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show Translation' })).toBeVisible();

    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText(/Card 1 of \d+/)).toBeVisible();
    // Previous is disabled on the first card.
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  test('shows the practice nudge toward real tests', async ({ page }) => {
    await openReview(page);
    await expect(page.getByText(/Flashcards are just for practice/)).toBeVisible();
    await expect(page.getByText(/Multiple Choice/)).toBeVisible();
  });

  test('exits back to the vocabulary list', async ({ page }) => {
    await openReview(page);
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('heading', { name: 'Flashcard Review' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AUTHED (mocked backend)
// ---------------------------------------------------------------------------

// A faked Supabase session (same approach as vocabulary.spec): override
// localStorage for the `sb-*-auth-token` key so supabase-js restores a session
// with no network call and the app renders authenticated.
const AUTH_USER_ID = '00000000-0000-4000-8000-0000000000bb';
const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const FAKE_JWT = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
  sub: AUTH_USER_ID,
  role: 'authenticated',
  aud: 'authenticated',
  exp: 9999999999,
})}.sig`;
const FAKE_SESSION = {
  access_token: FAKE_JWT,
  token_type: 'bearer',
  expires_in: 999999,
  expires_at: 9999999999,
  refresh_token: 'fake-refresh-token',
  user: {
    id: AUTH_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'ui-review@example.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

// One RPC word row, shaped like `select_test_words` output (stats nested under
// `stats`). A single-card deck makes reveal/advance assertions deterministic.
function rpcWord() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    user_id: AUTH_USER_ID,
    hebrew_word: 'שָׁלוֹם',
    english_translation: 'peace',
    definition: 'peace',
    transliteration: 'shalom',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    stats: {
      word_id: '11111111-1111-4111-8111-111111111111',
      correct_count: 0,
      incorrect_count: 3,
      total_attempts: 3,
      consecutive_correct: 0,
      confidence_score: 10,
    },
  };
}

test.describe('Flashcard review — authenticated (mocked backend)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((session) => {
      const orig = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key: string) {
        if (typeof key === 'string' && /^sb-.*-auth-token$/.test(key)) return JSON.stringify(session);
        return orig.call(this, key);
      };
    }, FAKE_SESSION);

    await page.route('**/auth/v1/user**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_SESSION.user) }),
    );
    // The adaptive selection the review uses.
    await page.route('**/rest/v1/rpc/select_test_words*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([rpcWord()]) }),
    );
    // The pool fetch the hook does before the RPC (only a fallback) — harmless.
    await page.route('**/rest/v1/vocabulary_words*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([rpcWord()]) }),
    );
  });

  test('drills the adaptively-selected word and reveals its translation', async ({ page }) => {
    await page.goto('/');
    await gotoVocabulary(page);
    await openReview(page);

    await expect(page.getByText(/Card 1 of 1/)).toBeVisible();
    // The word also appears in the vocabulary list behind the overlay (our pool
    // mock populates it), so scope to the card, which renders last in the DOM.
    await expect(page.getByText('שָׁלוֹם').last()).toBeVisible();

    await page.getByRole('button', { name: 'Show Translation' }).click();
    await expect(page.getByText('peace').first()).toBeVisible();
    await expectNoScoringUI(page);
  });

  test('never issues a scoring write while reviewing', async ({ page }) => {
    // Any request to a scoring surface fails the test's intent — count them.
    let scoringWrites = 0;
    for (const pattern of [
      '**/rest/v1/user_tests*',
      '**/rest/v1/test_responses*',
      '**/rest/v1/word_statistics*',
      '**/rest/v1/rpc/save_complete_test_results*',
    ]) {
      await page.route(pattern, (route: Route) => {
        if (route.request().method() !== 'GET') scoringWrites += 1;
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      });
    }

    await page.goto('/');
    await gotoVocabulary(page);
    await openReview(page);

    // A full reveal cycle — the moment the old flashcard test would have scored.
    await page.getByRole('button', { name: 'Show Translation' }).click();
    await expect(page.getByText('peace').first()).toBeVisible();
    await page.getByRole('button', { name: 'Hide Translation' }).click();
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible();
    expect(scoringWrites).toBe(0);
  });
});
