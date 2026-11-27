import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveBackend, resolveServiceRoleKey } from '../setup/fixtureBackend';

// URL-extraction roundtrip e2e (REAL backend, REAL Gemini — nothing is stubbed).
//
// This proves the whole URL feeder plumbing end-to-end against the real test
// backend, and that each of the three caches is populated on first use and
// served on the second:
//   1. extract  — enter a URL -> `gemini-translate/extract-url` fetches the page
//                 (sefaria_cache MISS), Hebrew lands in the panel.
//   2. translate— the panel auto-translates (translation_cache MISS -> real
//                 `/translate`); a fresh reload of the same URL serves it from
//                 cache (HIT, zero `/translate` calls).
//   3. define   — click a Hebrew word (word_definitions MISS -> real `/define`,
//                 popup opens); after a fresh reload, clicking it again is a HIT
//                 (zero `/define` calls).
//
// MISS vs HIT is measured by COUNTING real calls to each edge function via
// page.route(...).continue() (count-and-forward, never fulfill-with-a-fake) —
// the same idea as the backbone spec's translateCalls(), but against the real
// backend. The "second time" is a full page reload, not just a re-click, so the
// in-memory request deduplicator/SPA state is reset and the repeat genuinely
// exercises the DATABASE cache rather than an in-process shortcut.
//
// OWNED FIXTURE URL — IMPORTANT. `extract-url` runs on the REMOTE Supabase test
// project, so it can only fetch a PUBLIC url; it cannot reach the Playwright
// localhost web server. The fixture page (public/test-fixtures/hebrew-article.html)
// is therefore served from the app's own deploy and pointed at by its public
// URL. Until that page is actually deployed (it rides the gated prod deploy),
// the fixture isn't reachable and this spec SKIPS cleanly (see beforeAll) rather
// than failing — matching the repo's "skip until configured" convention.
//
// Override the target with FIXTURE_ARTICLE_URL (e.g. a staging host, or a
// host.docker.internal address when running the whole thing on a local stack).
//
// Flakiness note (accepted): translation/definition caches are keyed by content,
// not by user, so two CI runs translating the SAME fixture text at the SAME time
// could turn a MISS into a HIT. That only bites under concurrent runs, which is
// out of scope here. The teardown (and a start-of-run clear) make the spec robust
// to a PRIOR crashed run.

const FIXTURE_URL =
  process.env.FIXTURE_ARTICLE_URL ||
  'https://learn-ivrit.com/test-fixtures/hebrew-article.html';

// A distinctive, real Hebrew word that appears as its own token in the fixture
// prose (paragraph 2: "...פְּרָחִים צִבְעוֹנִיִּים..."). cleanWord() keeps nikud, so
// word_definitions.word is stored with these exact vowel marks. Normalised to NFC
// so the combining marks are ordered the same way the fixture file (and therefore
// the DOM and the stored row) has them — otherwise an identical-looking word fails
// to string-match.
const TARGET_WORD = 'פְּרָחִים'.normalize('NFC');

// Populated in beforeAll from the live fixture's own JSON-LD, so the expected
// source text can never drift from the fixture file.
let fixtureParagraphs: string[] = [];
// The exact text `extract-url` returned this run (captured off the network), used
// for a precise teardown even if extraction normalises the prose.
let capturedContent = '';
let fixtureReachable = false;
let skipReason = '';
let admin: SupabaseClient | null = null;

// Real-call counters (cumulative across reloads within the test).
let extractCalls = 0;
let translateCalls = 0;
let defineCalls = 0;

const navButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();

/** Delete only the rows this fixture is responsible for, via the service role. */
async function cleanupCaches(extraChunks: string[] = []): Promise<void> {
  if (!admin) return;
  // sefaria_cache row is keyed by the exact URL we entered.
  await admin.from('sefaria_cache').delete().eq('reference', FIXTURE_URL);
  // word_definitions is global, keyed by the (nikud-bearing) word.
  await admin.from('word_definitions').delete().eq('word', TARGET_WORD);
  // translation_cache is keyed by content_hash, but carries the source text in
  // `hebrew_text`; delete exactly the paragraph rows we know are ours (the
  // fixture's own paragraphs, plus whatever extraction actually produced).
  const texts = ourTranslationTexts(extraChunks);
  if (texts.length) await admin.from('translation_cache').delete().in('hebrew_text', texts);
}

/** The exact `hebrew_text` values our translation_cache rows are keyed under —
 *  the fixture's own paragraphs ∪ whatever extraction actually produced. Shared
 *  by cleanup (delete) and the direct-state assertions (count) so they agree. */
function ourTranslationTexts(extraChunks: string[] = []): string[] {
  return Array.from(
    new Set([...fixtureParagraphs, ...extraChunks].map((t) => t.normalize('NFC'))),
  ).filter(Boolean);
}

// Direct cache-STATE reads via the service role — the authoritative "the row was
// actually written" receipt, complementing the network-count proof (reload never
// re-called the backend) and the render-equality proof (same text shown).
async function translationRowsPresent(extraChunks: string[] = []): Promise<number> {
  if (!admin) return 0;
  const texts = ourTranslationTexts(extraChunks);
  if (!texts.length) return 0;
  const { data } = await admin
    .from('translation_cache')
    .select('id, translation')
    .in('hebrew_text', texts);
  return (data ?? []).filter((r) => !!(r as { translation?: string }).translation).length;
}
async function sefariaRowPresent(): Promise<boolean> {
  if (!admin) return false;
  const { data } = await admin
    .from('sefaria_cache')
    .select('reference')
    .eq('reference', FIXTURE_URL)
    .maybeSingle();
  return !!data;
}
async function definitionRowPresent(): Promise<boolean> {
  if (!admin) return false;
  const { data } = await admin
    .from('word_definitions')
    .select('word')
    .eq('word', TARGET_WORD)
    .maybeSingle();
  return !!data;
}

test.beforeAll(async () => {
  // Build the service-role client used for setup/teardown of the shared caches.
  try {
    const { url } = resolveBackend();
    admin = createClient(url, resolveServiceRoleKey(), { auth: { persistSession: false } });
  } catch (err) {
    skipReason = `backend/service-role not configured: ${(err as Error).message}`;
    return;
  }

  // Is the owned fixture actually published yet? If not, skip (don't fail CI).
  let html = '';
  try {
    const res = await fetch(FIXTURE_URL);
    if (!res.ok) {
      skipReason = `fixture URL not reachable (HTTP ${res.status}): ${FIXTURE_URL} — deploy public/test-fixtures/ first.`;
      return;
    }
    html = await res.text();
  } catch (err) {
    skipReason = `fixture URL fetch failed: ${FIXTURE_URL} — ${(err as Error).message}`;
    return;
  }

  // Derive the expected source paragraphs from the fixture's own JSON-LD, so the
  // spec and the fixture file can never disagree.
  const m = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (m) {
    try {
      const body = (JSON.parse(m[1]) as { articleBody?: string }).articleBody || '';
      fixtureParagraphs = body.trim().split(/\n\n+/).filter(Boolean);
    } catch {
      /* fall through — paragraphs stay empty, handled by the content guard below */
    }
  }

  // A 200 is NOT enough to call the fixture "deployed": learn-ivrit.com is an SPA
  // that serves its app shell (HTTP 200) for ANY path, so a not-yet-deployed
  // fixture URL still "succeeds" — and then extract-url pulls the shell, no Hebrew
  // renders, and the test times out (exactly the CI failure this guards against).
  // Only run when the response actually IS the fixture: its JSON-LD article parsed
  // AND the distinctive target word is present. Otherwise skip cleanly.
  const isFixtureContent =
    fixtureParagraphs.length > 0 && html.normalize('NFC').includes(TARGET_WORD);
  if (!isFixtureContent) {
    skipReason =
      `fixture URL returned HTTP 200 but not the fixture content (SPA shell?) — ` +
      `deploy public/test-fixtures/ first: ${FIXTURE_URL}`;
    return;
  }

  fixtureReachable = true;
  // Clear anything a prior crashed run may have left, so the first pass is a MISS.
  await cleanupCaches();
});

test.afterAll(async () => {
  // Precise teardown even if the body failed partway: url + word + the paragraph
  // rows (fixture-derived and the ones extraction actually created this run).
  const chunks = capturedContent ? capturedContent.trim().split(/\n\n+/).filter(Boolean) : [];
  await cleanupCaches(chunks);
  // Prove cleanup actually removed our rows (also proves the deletes match the
  // same keys the writes used). Trivially satisfied when the spec was skipped.
  expect(await translationRowsPresent(chunks)).toBe(0);
  expect(await sefariaRowPresent()).toBe(false);
  expect(await definitionRowPresent()).toBe(false);
});

test.describe('URL extraction roundtrip (real backend)', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('extract -> translate(miss/hit) -> define(miss/hit) against an owned fixture URL', async ({
    page,
  }) => {
    test.skip(!fixtureReachable, skipReason || 'fixture not reachable');

    // Count real edge-function calls; forward every request to the real backend.
    // extract-url additionally captures the returned content for a precise teardown.
    await page.route('**/functions/v1/gemini-translate/extract-url', async (route) => {
      extractCalls += 1;
      const resp = await route.fetch();
      try {
        const json = (await resp.json()) as { content?: unknown };
        if (typeof json.content === 'string') capturedContent = json.content;
      } catch {
        /* non-JSON — leave capturedContent as-is; teardown falls back to fixture paragraphs */
      }
      await route.fulfill({ response: resp });
    });
    await page.route('**/functions/v1/gemini-translate/translate', (route) => {
      translateCalls += 1;
      return route.continue();
    });
    await page.route('**/functions/v1/gemini-translate/define', (route) => {
      defineCalls += 1;
      return route.continue();
    });

    // Drives Translate -> Load from URL -> enter the fixture URL -> Load, from a
    // fresh page each time so the DB cache (not an in-memory shortcut) is exercised.
    async function enterFixtureUrl() {
      await page.goto('/');
      await navButton(page, 'Translate').click();
      await page.getByRole('button', { name: /Load from URL/ }).click();
      const input = page.getByPlaceholder(/Enter URL/);
      await expect(input).toBeVisible({ timeout: 15000 });
      await input.fill(FIXTURE_URL);
      await page.getByRole('button', { name: 'Load', exact: true }).click();
      // Extraction landed when the distinctive source word is rendered.
      await expect(page.getByText(TARGET_WORD).first()).toBeVisible({ timeout: 30000 });
    }

    // Reads the SETTLED English translation out of the synced display. The
    // English cells are `<div lang="en">` (the only divs so tagged — the
    // `<html lang="en">` root is not a div), so this captures the translation
    // without a component change. Polls past the "Translating…/Translation will
    // appear here…" placeholders so we never snapshot a transient state.
    const PLACEHOLDER = /Translation will appear here|Translating\.\.\./;
    async function readTranslation(): Promise<string> {
      const cells = page.locator('div[lang="en"]');
      await expect
        .poll(
          async () => {
            const text = (await cells.allInnerText()).join('\n').trim();
            return text.length > 0 && !PLACEHOLDER.test(text);
          },
          { timeout: 30000 },
        )
        .toBe(true);
      return (await cells.allInnerText()).map((t) => t.trim().normalize('NFC')).join('\n');
    }

    // Reads the definition popup's full text. The popup carries no role, so the
    // component tags it data-testid="word-definition-popup" (the only prod touch).
    async function readDefinition(): Promise<string> {
      const popup = page.getByTestId('word-definition-popup');
      await expect(popup).toBeVisible({ timeout: 30000 });
      return (await popup.innerText()).trim().normalize('NFC');
    }

    // --- Phase 1: first load — extract MISS + translate MISS ---------------
    await enterFixtureUrl();
    expect(extractCalls).toBe(1); // sefaria_cache miss -> one real extract-url call
    await expect.poll(() => translateCalls, { timeout: 30000 }).toBeGreaterThan(0);
    // The translate fires once per paragraph (concurrently), so wait until the
    // count STOPS climbing before snapshotting — otherwise a late paragraph could
    // land during Phase 2 and look like a cache miss. Then give the edge function
    // a moment to finish writing translation_cache.
    await expect
      .poll(
        async () => {
          const before = translateCalls;
          await page.waitForTimeout(1500);
          return translateCalls === before;
        },
        { timeout: 30000 },
      )
      .toBe(true);
    await page.waitForTimeout(1500);
    const translatesAfterFirst = translateCalls;
    // Snapshot the real, cache-populating translation so Phase 2 can prove the
    // cached reload renders the SAME text — the direct check that "the
    // translation is exactly the same once extraction takes place".
    const translationFirst = await readTranslation();
    expect(translationFirst.length).toBeGreaterThan(0);
    // Direct DB receipt: the caches were actually WRITTEN (not merely rendered).
    // `capturedContent` is the exact text extraction returned this run, so we look
    // for the rows under the same keys the app would have used.
    const chunks1 = capturedContent ? capturedContent.trim().split(/\n\n+/).filter(Boolean) : [];
    expect(await translationRowsPresent(chunks1)).toBeGreaterThan(0); // translation_cache populated
    expect(await sefariaRowPresent()).toBe(true); // sefaria_cache populated (extracted content)

    // --- Phase 2: reload the same URL — extract HIT + translate HIT --------
    await enterFixtureUrl();
    expect(extractCalls).toBe(1); // still one: served from sefaria_cache
    expect(translateCalls).toBe(translatesAfterFirst); // zero new: translation_cache hit
    // Byte-identical translation on reload. Present + equal + zero new /translate
    // calls ⇒ genuinely served from translation_cache (and not silently skipped,
    // which a call-count check alone could not distinguish).
    expect(await readTranslation()).toBe(translationFirst);

    // The word is clickable on this (cache-served) page. Click it — define MISS.
    await page.getByText(TARGET_WORD).first().click();
    await expect(page.getByRole('button', { name: /Add to Vocabulary/i })).toBeVisible({
      timeout: 30000,
    });
    expect(defineCalls).toBe(1); // word_definitions miss -> one real define call
    // Capture the real (cache-populating) definition for the Phase 3 comparison.
    const definitionFirst = await readDefinition();
    expect(definitionFirst.length).toBeGreaterThan(0);
    await page.waitForTimeout(1500); // let the edge function persist the definition
    expect(await definitionRowPresent()).toBe(true); // word_definitions populated

    // --- Phase 3: fresh reload, click the same word — define HIT -----------
    await enterFixtureUrl();
    expect(extractCalls).toBe(1);
    expect(translateCalls).toBe(translatesAfterFirst);
    await page.getByText(TARGET_WORD).first().click();
    await expect(page.getByRole('button', { name: /Add to Vocabulary/i })).toBeVisible({
      timeout: 30000,
    });
    expect(defineCalls).toBe(1); // still one: served from word_definitions cache
    // Same definition rendered from word_definitions on the cached click.
    expect(await readDefinition()).toBe(definitionFirst);
  });
});
