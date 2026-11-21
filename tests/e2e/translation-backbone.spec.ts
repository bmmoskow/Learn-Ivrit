import { test, expect, type Page, type Route } from '@playwright/test';

// TranslationPanel "backbone" E2E spec.
//
// The Translation Panel is the shared trunk every input method feeds into:
// text paste, image OCR, URL extraction, Bible load and AI generation all land
// on the same translate -> synced-display -> word-definition-popup path. This
// spec exercises that trunk entered via the simplest door (Paste or Type), so a
// break in the shared machinery is caught once here rather than N times across
// the per-input specs.
//
// Guest mode is fully client-side (AuthContext short-circuits on
// localStorage.guestMode === 'true' with NO backend auth call), so the only
// backend the guest trunk touches is the paid third party — Gemini, behind the
// gemini-translate edge function. We stub ONLY that (plus the client-side
// Supabase REST cache reads the trunk does before calling it), exactly like the
// mocked UI suite does, which lets the guest flow run deterministically here
// with no Docker/sandbox. Everything else is the real built app in a real
// browser.
//
// The authenticated save loop is a fill-in-later (test.fixme): it needs a real
// seeded user + auth storageState (playwright/.auth/user.json). A faked
// localStorage JWT will not pass real RLS, so there is nothing to gain from
// sketching it against a stub — see the authenticated describe at the bottom,
// matching the convention in vocabulary.spec.ts / flashcard-review.spec.ts.

// A fixed Hebrew input whose canned translation and canned definition are
// chosen to never share a substring, so text assertions can't collide across
// the translate step and the definition-popup step.
const HEBREW_INPUT = 'שלום עולם';
const HEBREW_WORD = 'שלום'; // first (clickable) word of the source
const TRANSLATED_TEXT = 'A warm welcome to everyone';

// Canned define response, shaped exactly as define.ts returns it and as
// useWordDefinitionPopup consumes it (wordWithVowels / definition /
// transliteration / forms / examples / notes). None of these tokens appear in
// TRANSLATED_TEXT above.
const DEFINE_WORD_WITH_VOWELS = 'שָׁלוֹם';
const DEFINE_TRANSLITERATION = 'shalom';
const DEFINE_DEFINITION = 'peace; greeting';

const navButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();

/**
 * Stub the paid third party (gemini-translate) and the client-side Supabase
 * cache reads the trunk performs before reaching it. Returns a getter for how
 * many times the translate endpoint was hit, so the regression test can assert
 * the call actually happened (a past guest-mode bug silently skipped it).
 */
async function stubBackend(page: Page): Promise<{ translateCalls: () => number }> {
  let translateCount = 0;

  // The popup reads word_definitions client-side first and only calls the edge
  // function on a miss. With no backend we must force that read to MISS: an
  // empty array makes supabase-js .maybeSingle() resolve to null (0 rows), so
  // the popup falls through to the stubbed /define call below.
  await page.route('**/rest/v1/word_definitions*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );

  // The translate path reads translation_cache client-side first; same reason —
  // force a miss so it falls through to the stubbed /translate call.
  await page.route('**/rest/v1/translation_cache*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );

  // Benign catch-alls for any other incidental Supabase REST / auth traffic, so
  // a stray call can't wedge the guest flow (guest mode should need almost none
  // of these). Mirrors tests/support/mock-backend.ts.
  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/auth/v1/**', (route) => {
    if (route.request().url().includes('/user')) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'no session' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  // THE CRUX: stub only gemini-translate. index.ts routes by URL path
  // (/translate vs /define); the request bodies differ too — translate sends
  // { text, ... } (handleTranslate) and define sends { word, ... }
  // (handleDefine) — so we discriminate off postData per the prompt and fulfill
  // a canned response shaped exactly as the client consumes each.
  await page.route('**/functions/v1/gemini-translate/**', (route: Route) => {
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(route.request().postData() || '{}');
    } catch {
      /* non-JSON body — fall through to the define default below */
    }

    // Translate: useTranslationPanel.translateChunk reads data.translation.
    if (typeof body.text === 'string') {
      translateCount += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ translation: TRANSLATED_TEXT }),
      });
    }

    // Define: useWordDefinitionPopup consumes these fields via
    // mapApiResponseToDefinition.
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        wordWithVowels: DEFINE_WORD_WITH_VOWELS,
        definition: DEFINE_DEFINITION,
        transliteration: DEFINE_TRANSLITERATION,
        examples: [],
        notes: '',
        forms: [
          { hebrew: 'שָׁלֵם', transliteration: 'shalem', relationship: 'adjective: complete, whole' },
        ],
      }),
    });
  });

  return { translateCalls: () => translateCount };
}

/** Enter the fixed Hebrew through Paste or Type -> TextInputDialog. */
async function pasteHebrew(page: Page) {
  await page.getByRole('button', { name: 'Paste or Type' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Type or paste your text here...').fill(HEBREW_INPUT);
  // Scope to the dialog: the nav also has a "Translate" button.
  await dialog.getByRole('button', { name: 'Translate' }).click();
}

test.describe('Translation backbone (guest)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('guestMode', 'true');
      } catch {
        /* storage unavailable */
      }
    });
  });

  test('guest can translate', async ({ page }) => {
    // Regression guard: there was a real past bug where guest mode silently did
    // NOT translate. This must fail loudly if it ever returns — we assert BOTH
    // that the Gemini translate route was actually called AND that the
    // translated text rendered in the synced display.
    const { translateCalls } = await stubBackend(page);

    await page.goto('/');
    await navButton(page, 'Translate').click();
    await expect(page.getByRole('button', { name: 'Paste or Type' })).toBeVisible({ timeout: 15000 });

    await pasteHebrew(page);

    // Translated text appears in the synced display...
    await expect(page.getByText(TRANSLATED_TEXT)).toBeVisible({ timeout: 15000 });
    // ...and the paid translate endpoint was genuinely exercised.
    expect(translateCalls()).toBeGreaterThan(0);
  });

  test('clicking a Hebrew word opens the definition popup', async ({ page }) => {
    await stubBackend(page);

    await page.goto('/');
    await navButton(page, 'Translate').click();
    await expect(page.getByRole('button', { name: 'Paste or Type' })).toBeVisible({ timeout: 15000 });

    await pasteHebrew(page);
    await expect(page.getByText(TRANSLATED_TEXT)).toBeVisible({ timeout: 15000 });

    // Each Hebrew source word is a clickable span; click the first one.
    await page.getByText(HEBREW_WORD, { exact: true }).click();

    // The WordDefinitionPopup opens and shows the stubbed definition
    // (vocalized headword, transliteration, and the English gloss).
    await expect(page.getByRole('heading', { name: DEFINE_WORD_WITH_VOWELS })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(DEFINE_TRANSLITERATION)).toBeVisible();
    await expect(page.getByText('peace')).toBeVisible();
    // Guests are told to sign up rather than offered a save.
    await expect(page.getByText('Sign up for an account to save words to your vocabulary')).toBeVisible();
  });

  test('guest Vocabulary shows the example list with no personal save affordance', async ({ page }) => {
    await stubBackend(page);

    await page.goto('/');
    await navButton(page, 'Vocabulary').click();

    // The guest teaser list renders...
    await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Example Vocabulary List' })).toBeVisible();

    // ...but guests get no way to add their own words (the "Add Word" control
    // is authenticated-only).
    await expect(page.getByRole('button', { name: /Add Word/i })).toHaveCount(0);
  });
});

test.describe('Translation backbone (authenticated)', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  // fill-in-later: needs a seeded test user + auth storageState in the sandbox /
  // test project (playwright/.auth/user.json). A faked localStorage JWT would
  // not pass real RLS, so the save-to-vocabulary insert can't be meaningfully
  // exercised until that fixture exists — same convention as vocabulary.spec.ts
  // and flashcard-review.spec.ts. Sketch of the loop to fill in:
  //   paste Hebrew -> stubbed translate renders -> click a word ->
  //   "Add to Vocabulary" (enabled for authed users) -> navigate to Vocabulary
  //   -> the saved word is present in the real list.
  test.fixme('authenticated user can save a translated word to their vocabulary', async ({ page }) => {
    await page.goto('/');
    await navButton(page, 'Translate').click();
    await page.getByRole('button', { name: 'Paste or Type' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Type or paste your text here...').fill(HEBREW_INPUT);
    await dialog.getByRole('button', { name: 'Translate' }).click();

    await page.getByText(HEBREW_WORD, { exact: true }).click();
    await page.getByRole('button', { name: /Add to Vocabulary/i }).click();
    await expect(page.getByRole('button', { name: /Saved to Vocabulary/i })).toBeVisible();

    await navButton(page, 'Vocabulary').click();
    await expect(page.getByText(DEFINE_WORD_WITH_VOWELS)).toBeVisible();
  });
});
