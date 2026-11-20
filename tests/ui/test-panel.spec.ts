import { test, expect, type Page } from '../support/mock-backend';
import type { Route } from '@playwright/test';
import { defaultVocabulary } from '../../src/data/defaultVocabulary';

// UI suite (MOCKED backend) for the TestPanel — the two objective, scored test
// types: Multiple Choice and Fill in the Blank. Real browser, no real backend.
// Two worlds, matching vocabulary.spec / flashcard-review.spec:
//   • GUEST  — localStorage `guestMode`, the in-memory default deck, entirely
//              client-side. Guest multiple-choice surfaces only the correct
//              option (distractors come from a backend the guest never calls),
//              so the happy path is deterministic without any mocks.
//   • AUTHED — a faked Supabase session plus a route-mocked `select_test_words`
//              RPC (a small deterministic deck) and a counted
//              `save_complete_test_results` RPC, so we can assert the real
//              save-on-finish behaviour.
// The Hebrew word a question shows is read from the card and mapped back to its
// English, so we can answer correctly (or deliberately wrong) regardless of the
// adaptive shuffle.

const navButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();

async function gotoTest(page: Page) {
  await navButton(page, 'Test').click();
  await expect(page.getByRole('heading', { name: 'Test Your Knowledge' })).toBeVisible({ timeout: 15000 });
}

async function startTest(page: Page, label: RegExp) {
  await page.getByRole('button', { name: label }).click();
  await expect(page.getByText(/Question \d+ of \d+/).first()).toBeVisible({ timeout: 15000 });
}

async function readTotal(page: Page): Promise<number> {
  const text = (await page.getByText(/Question \d+ of \d+/).first().textContent()) ?? '';
  return Number(/of (\d+)/.exec(text)![1]);
}

// The Hebrew prompt is the only RTL element on an active test card.
async function currentHebrew(page: Page): Promise<string> {
  return ((await page.locator('[dir="rtl"]').first().textContent()) ?? '').trim();
}

// Guest multiple choice shows a single (correct) option; authed shows four and
// the correct one is always present — either way clicking it by its English name
// answers correctly.
async function answerMultipleChoice(page: Page, map: Record<string, string>) {
  const english = map[await currentHebrew(page)];
  await page.getByRole('button', { name: english, exact: true }).click();
}

async function submitFillInBlank(page: Page, answer: string) {
  await page.getByPlaceholder('Type your answer...').fill(answer);
  await page.getByRole('button', { name: 'Submit Answer' }).click();
}

const GUEST_MAP: Record<string, string> = Object.fromEntries(
  defaultVocabulary.map((w) => [w.hebrew, w.english]),
);

// ---------------------------------------------------------------------------
// GUEST
// ---------------------------------------------------------------------------
test.describe('TestPanel — guest mode', () => {
  test.beforeEach(async ({ page }) => {
    // Guest mode is driven purely by this flag (AuthContext reads it first,
    // before any Supabase call), so no backend is involved at all.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('guestMode', 'true');
      } catch {
        /* storage unavailable */
      }
    });
    await page.goto('/');
    await gotoTest(page);
  });

  test('completes a multiple choice test and reaches the results screen', async ({ page }) => {
    test.setTimeout(120_000); // each answer has a built-in feedback delay

    await startTest(page, /Multiple Choice/);
    await expect(page.getByText('Choose the correct translation:')).toBeVisible();

    const total = await readTotal(page);
    for (let n = 1; n <= total; n++) {
      await expect(page.getByText(`Question ${n} of ${total}`)).toBeVisible({ timeout: 15000 });
      await answerMultipleChoice(page, GUEST_MAP);
    }

    // Results: every guest MC answer is the one offered (correct) → 100%.
    await expect(page.getByRole('heading', { name: 'Test Complete!' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('100%')).toBeVisible();
  });

  test('marks a wrong fill-in-the-blank answer incorrect and advances', async ({ page }) => {
    await startTest(page, /Fill in the Blank/);
    await expect(page.getByText(/Question 1 of \d+/)).toBeVisible();

    await submitFillInBlank(page, 'definitely-not-a-word');

    // Feedback reveals the correct answer, then the test advances face-down.
    await expect(page.getByText('Incorrect')).toBeVisible();
    await expect(page.getByText(/Correct answer:/)).toBeVisible();
    await expect(page.getByText(/Question 2 of \d+/)).toBeVisible({ timeout: 15000 });
  });

  test('completes a fill-in-the-blank test and reaches the results screen', async ({ page }) => {
    test.setTimeout(120_000);

    await startTest(page, /Fill in the Blank/);

    const total = await readTotal(page);
    for (let n = 1; n <= total; n++) {
      await expect(page.getByText(`Question ${n} of ${total}`)).toBeVisible({ timeout: 15000 });
      await submitFillInBlank(page, GUEST_MAP[await currentHebrew(page)]);
      if (n === 1) await expect(page.getByText('Correct!')).toBeVisible();
    }

    await expect(page.getByRole('heading', { name: 'Test Complete!' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('100%')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AUTHED (mocked backend)
// ---------------------------------------------------------------------------

// A faked Supabase session (same approach as vocabulary.spec / flashcard-review
// .spec): override localStorage for the `sb-*-auth-token` key so supabase-js
// restores a session with no network call and the app renders authenticated.
const AUTH_USER_ID = '00000000-0000-4000-8000-0000000000cc';
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
    email: 'ui-test-panel@example.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

// A small deterministic deck with unique Hebrew and unique English, so every
// option/answer maps unambiguously. Shaped like `select_test_words` output
// (stats nested under `stats`); the same rows also stand in for the direct
// vocabulary_words load that populates the selection screen.
type DeckRow = {
  id: string;
  user_id: string;
  hebrew_word: string;
  english_translation: string;
  definition: string;
  transliteration: string | null;
  created_at: string;
  updated_at: string;
  stats: null;
};
const mkRow = (id: string, he: string, en: string): DeckRow => ({
  id,
  user_id: AUTH_USER_ID,
  hebrew_word: he,
  english_translation: en,
  definition: en,
  transliteration: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  stats: null,
});
const DECK: DeckRow[] = [
  mkRow('11111111-1111-4111-8111-111111111111', 'סֵפֶר', 'book'),
  mkRow('22222222-2222-4222-8222-222222222222', 'עֵץ', 'tree'),
  mkRow('33333333-3333-4333-8333-333333333333', 'מַיִם', 'water'),
  mkRow('44444444-4444-4444-8444-444444444444', 'אֶרֶץ', 'land'),
  mkRow('55555555-5555-4555-8555-555555555555', 'שֶׁמֶשׁ', 'sun'),
];
const DECK_MAP: Record<string, string> = Object.fromEntries(
  DECK.map((w) => [w.hebrew_word, w.english_translation]),
);

test.describe('TestPanel — authenticated (mocked backend)', () => {
  // Captured `save_complete_test_results` payloads, per test.
  let savedPayloads: Array<Record<string, unknown>>;

  test.beforeEach(async ({ page }) => {
    savedPayloads = [];

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
    // The selection screen's direct vocabulary load, and the adaptive RPC used
    // to build both the question set and the MC distractor pool.
    await page.route('**/rest/v1/vocabulary_words*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DECK) }),
    );
    await page.route('**/rest/v1/rpc/select_test_words*', (route: Route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DECK) }),
    );
    // The scored save fired once on finish. Count + capture, return a test id.
    await page.route('**/rest/v1/rpc/save_complete_test_results*', (route: Route) => {
      savedPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify('11111111-aaaa-4aaa-8aaa-111111111111'),
      });
    });
  });

  test('answers a full multiple choice test and saves a perfect score once', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    await gotoTest(page);
    await startTest(page, /Multiple Choice/);

    const total = await readTotal(page);
    expect(total).toBe(DECK.length);
    for (let n = 1; n <= total; n++) {
      await expect(page.getByText(`Question ${n} of ${total}`)).toBeVisible({ timeout: 15000 });
      await answerMultipleChoice(page, DECK_MAP);
    }

    await expect(page.getByRole('heading', { name: 'Test Complete!' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('100%')).toBeVisible();

    // The app saves exactly once, on finish, with the real payload shape.
    await expect.poll(() => savedPayloads.length, { timeout: 15000 }).toBe(1);
    const payload = savedPayloads[0];
    expect(payload.p_test_type).toBe('multiple_choice');
    expect(payload.p_total_questions).toBe(total);
    expect(payload.p_correct_answers).toBe(total);
    expect(Number(payload.p_score_percentage)).toBe(100);
  });

  test('saves a fill-in-the-blank test with one wrong answer reflected in the score', async ({ page }) => {
    test.setTimeout(90_000);

    await page.goto('/');
    await gotoTest(page);
    await startTest(page, /Fill in the Blank/);

    const total = await readTotal(page);
    expect(total).toBe(DECK.length);
    for (let n = 1; n <= total; n++) {
      await expect(page.getByText(`Question ${n} of ${total}`)).toBeVisible({ timeout: 15000 });
      // Miss the first question on purpose; answer the rest correctly.
      const answer = n === 1 ? 'definitely-not-a-word' : DECK_MAP[await currentHebrew(page)];
      await submitFillInBlank(page, answer);
    }

    await expect(page.getByRole('heading', { name: 'Test Complete!' })).toBeVisible({ timeout: 15000 });

    await expect.poll(() => savedPayloads.length, { timeout: 15000 }).toBe(1);
    const payload = savedPayloads[0];
    expect(payload.p_test_type).toBe('fill_in_blank');
    expect(payload.p_total_questions).toBe(total);
    expect(payload.p_correct_answers).toBe(total - 1);
    expect(Number(payload.p_score_percentage)).toBe(Math.round(((total - 1) / total) * 100));
  });
});
