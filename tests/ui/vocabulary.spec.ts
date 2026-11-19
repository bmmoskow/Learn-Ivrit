import { test, expect, type Page } from '../support/mock-backend';
import type { Route } from '@playwright/test';

// UI suite (MOCKED backend) for the Vocabulary page. Real browser, no real
// backend. Two clearly separated worlds, because they are different code paths:
//   • GUEST  — localStorage `guestMode`, in-memory default list, client-side
//              search, NO sort controls (see the guest-UX change).
//   • AUTHED — a faked Supabase session (injected via localStorage) plus
//              route-mocked PostgREST responses, so we can drive populate / sort
//              / debounced-search / pagination deterministically.
//
// NOTE (sequencing): the GUEST expectations below encode the post guest-UX
// behavior (sort controls hidden, search filters). They depend on that change
// being present; land it before/with this spec.

const navButton = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();

async function gotoVocabulary(page: Page) {
  await navButton(page, 'Vocabulary').click();
  await expect(page.getByRole('heading', { name: 'My Vocabulary' })).toBeVisible({ timeout: 15000 });
}

// ---------------------------------------------------------------------------
// GUEST
// ---------------------------------------------------------------------------
test.describe('Vocabulary — guest mode', () => {
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
    await gotoVocabulary(page);
  });

  test('shows the example-list teaser', async ({ page }) => {
    await expect(page.getByText('Example Vocabulary List')).toBeVisible();
    // A couple of the curated default words render.
    await expect(page.getByText('אני').first()).toBeVisible();
  });

  test('hides all sort controls for guests', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Date Added', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Alphabetical', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Performance', exact: true })).toHaveCount(0);
  });

  test('search filters the default list client-side (no vocabulary query)', async ({ page }) => {
    // Count only vocabulary-table traffic: guests must never query it (the list
    // and its search are entirely client-side). Other incidental app REST calls
    // are irrelevant to this assertion.
    let vocabCalls = 0;
    await page.route('**/rest/v1/vocabulary*', (route) => {
      vocabCalls += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    // Before searching, a non-matching word is present.
    await expect(page.getByText('שתיים').first()).toBeVisible(); // "two"

    await page.getByPlaceholder('Search...').fill('one');

    // After the 300ms debounce, only the matching word remains.
    await expect(page.getByText('אחת').first()).toBeVisible(); // "one"
    await expect(page.getByText('שתיים')).toHaveCount(0);

    expect(vocabCalls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AUTHED
// ---------------------------------------------------------------------------

// A faked Supabase session. We override localStorage.getItem for the
// `sb-*-auth-token` key (robust to whatever project URL the app was built
// against), so supabase-js restores this session without any network call and
// the app renders as authenticated. PostgREST traffic is route-mocked per test.
const AUTH_USER_ID = '00000000-0000-4000-8000-0000000000aa';
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
    email: 'ui-authed@example.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

type Row = { id: string; hebrew_word: string; english_translation: string; definition: string };
const mk = (id: string, he: string, en: string): Row => ({
  id,
  hebrew_word: he,
  english_translation: en,
  definition: en,
});

// Fulfill a PostgREST list response, including the Content-Range header that
// supabase-js reads to populate `count` (`{ count: 'exact' }`).
function restList(route: Route, rows: Row[], total = rows.length) {
  const partial = total > rows.length;
  return route.fulfill({
    // 206 when the server window is smaller than the total, like real PostgREST.
    status: partial ? 206 : 200,
    headers: {
      'content-type': 'application/json',
      'content-range': `0-${Math.max(rows.length - 1, 0)}/${total}`,
      // The app is served cross-origin from the (mocked) Supabase URL, so
      // content-range must be explicitly exposed for supabase-js to read `count`.
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'content-range, content-length',
    },
    body: JSON.stringify(rows),
  });
}

test.describe('Vocabulary — authenticated (mocked backend)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((session) => {
      const orig = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key: string) {
        if (typeof key === 'string' && /^sb-.*-auth-token$/.test(key)) return JSON.stringify(session);
        return orig.call(this, key);
      };
    }, FAKE_SESSION);

    // If the client ever validates the token over the network, answer with the
    // user rather than the fixture's default 401.
    await page.route('**/auth/v1/user**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_SESSION.user) }),
    );
    // word_statistics join (date/alpha paths do a second call) — empty is fine.
    await page.route('**/rest/v1/word_statistics*', (route) => restList(route, []));
  });

  test('populates the list and shows the Performance column for authed users', async ({ page }) => {
    await page.route('**/rest/v1/vocabulary_words*', (route) =>
      restList(route, [mk('1', 'שלום', 'peace'), mk('2', 'בוקר', 'morning')]),
    );

    await page.goto('/');
    await gotoVocabulary(page);

    await expect(page.getByText('peace').first()).toBeVisible();
    await expect(page.getByText('morning').first()).toBeVisible();
    // The Performance column header is authed-only.
    await expect(page.getByText('Performance').first()).toBeVisible();
  });

  test('changing the sort re-requests with the right order and re-renders', async ({ page }) => {
    const seenOrders: string[] = [];
    await page.route('**/rest/v1/vocabulary_words*', (route) => {
      const url = route.request().url();
      const order = /order=([^&]+)/.exec(url)?.[1] ?? '';
      seenOrders.push(decodeURIComponent(order));
      // Return a different order depending on the requested sort, so a correct
      // re-render is observable.
      const rows = order.includes('hebrew_word')
        ? [mk('a', 'אבא', 'dad'), mk('b', 'בית', 'house')] // alphabetical
        : [mk('b', 'בית', 'house'), mk('a', 'אבא', 'dad')]; // date (default)
      return restList(route, rows);
    });

    await page.goto('/');
    await gotoVocabulary(page);
    await expect(page.getByText('house').first()).toBeVisible();

    await page.getByRole('button', { name: 'Alphabetical', exact: true }).click();

    await expect
      .poll(() => seenOrders.some((o) => o.includes('hebrew_word.asc')))
      .toBe(true);
    await expect(page.getByText('dad').first()).toBeVisible();
  });

  test('debounced search issues one filtered request and re-renders', async ({ page }) => {
    const searchRequests: string[] = [];
    await page.route('**/rest/v1/vocabulary_words*', (route) => {
      const url = route.request().url();
      if (url.includes('or=')) {
        searchRequests.push(url);
        return restList(route, [mk('1', 'שלום', 'peace')]);
      }
      return restList(route, [mk('1', 'שלום', 'peace'), mk('2', 'בוקר', 'morning')]);
    });

    await page.goto('/');
    await gotoVocabulary(page);
    await expect(page.getByText('morning').first()).toBeVisible();

    await page.getByPlaceholder('Search...').fill('peace');

    await expect(page.getByText('morning')).toHaveCount(0);
    await expect(page.getByText('peace').first()).toBeVisible();
    // Debounce: typing one value should yield a single ilike request, not one
    // per keystroke.
    expect(searchRequests.length).toBe(1);
    expect(searchRequests[0]).toMatch(/ilike/);
  });

  test('shows pagination controls when there is more than one page', async ({ page }) => {
    // 120 total with a 50/page server window → multiple pages.
    const rows = Array.from({ length: 50 }, (_, i) => mk(String(i), `מילה${i}`, `word${i}`));
    await page.route('**/rest/v1/vocabulary_words*', (route) => restList(route, rows, 120));

    await page.goto('/');
    await gotoVocabulary(page);

    await expect(page.getByText('word0').first()).toBeVisible();
    // Page 2 control is present.
    await expect(page.getByRole('button', { name: '2', exact: true })).toBeVisible();
  });
});
