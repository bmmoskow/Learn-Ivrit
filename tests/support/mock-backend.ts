import { test as base, expect } from '@playwright/test';

// Mocked-backend fixture for the UI suite (tests/ui). It intercepts ALL
// Supabase traffic — auth (GoTrue), REST (PostgREST) and edge functions — so UI
// tests are deterministic and never touch a real backend, regardless of which
// URL the app was built against. Any Supabase call that isn't explicitly
// handled still gets a benign stub, so a missing mock can't silently leak to a
// real network. Tests can add their own `page.route(...)` overrides before
// navigating to shape specific responses.
export const test = base.extend({
  // Note: the fixture's provide-callback is named `provide` (not Playwright's
  // conventional `use`) so eslint's react-hooks rule doesn't mistake it for
  // React's `use` hook.
  page: async ({ page }, provide) => {
    // Auth: respond as a signed-out (guest) session.
    await page.route('**/auth/v1/**', (route) => {
      const url = route.request().url();
      if (url.includes('/user')) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'no session' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // REST (PostgREST): empty result sets by default.
    await page.route('**/rest/v1/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );

    // Edge functions (gemini-translate, sefaria-fetch, ...): canned stub.
    await page.route('**/functions/v1/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ mocked: true }),
      }),
    );

    await provide(page);
  },
});

export { expect };
