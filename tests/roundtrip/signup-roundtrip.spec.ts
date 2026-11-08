import { test, expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { getSignupOtp } from './mailbox';

// UI twin of src/test/signupRoundtrip.roundtriptest.ts. Same ten-step sign-up
// round-trip, but driven THROUGH THE BROWSER UI (forms, the OTP widget, the
// Settings delete dialog) instead of the Supabase client directly:
//   1 sign up  2 get the code emailed  3 apply the code  4 confirm authenticated
//   5 create DB data  6 log out  7 log back in  8 delete account
//   9 log back in (rejected)  10 confirm user + data gone from the DB.
//
// LOCAL-ONLY, like the vitest round-trip: it needs email confirmations ON plus a
// local mailbox (Mailpit) to read the emailed code — which only the local Docker
// stack provides, not the remote TEST project. Run it via
// `npm run test:signup-roundtrip-ui`, which boots a throwaway stack with
// confirmations on, then restores. The final DB-deletion check (step 10) can't be
// done from the browser, so it uses the service-role key out-of-band.

// --- Service-role creds (process.env first, then .env.local the sandbox wrote) ---
function readLocalEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const text = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[line.slice(0, eq).trim()] = val;
    }
  } catch {
    /* no .env.local — handled by the null-check below */
  }
  return out;
}

const localEnv = readLocalEnv();
const SERVICE_URL = process.env.VITE_SUPABASE_URL || localEnv.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || localEnv.SUPABASE_SERVICE_ROLE_KEY || '';

const TEST_PASSWORD = 'roundtrip-ui-Pass123!';
const uniqueEmail = () =>
  `signup-roundtrip-ui+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

// --- Small UI helpers -------------------------------------------------------
// The nav renders at three breakpoints (all in the DOM); target the visible one.
function navButton(page: Page, name: string) {
  return page.getByRole('button', { name, exact: true }).filter({ visible: true }).first();
}

async function expectAuthenticated(page: Page) {
  // The authenticated shell shows the nav's "Sign Out" button; the Login screen
  // does not. Generous timeout — the first authenticated render cold-loads chunks.
  await expect(navButton(page, 'Sign Out')).toBeVisible({ timeout: 30000 });
}

test.describe('sign-up round-trip (UI + emailed OTP, local stack)', () => {
  test('signs up through the UI, verifies the emailed code, uses it, then deletes it', async ({ page }) => {
    test.setTimeout(150000);

    expect(
      SERVICE_KEY,
      'Needs SUPABASE_SERVICE_ROLE_KEY (step 10 verification) — run `npm run sandbox:env` first.',
    ).not.toBe('');
    const admin: SupabaseClient = createClient(SERVICE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const email = uniqueEmail();

    await page.goto('/');

    // 1. Sign up through the form.
    await navButton(page, "Don't have an account? Sign up").click();
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    // 2. Read the emailed 6-digit code out of the local mailbox.
    const code = await getSignupOtp(email, { timeoutMs: 30000 });
    expect(code).toMatch(/^\d{6}$/);

    // 3. Apply the code in the OTP widget.
    await expect(page.locator('input[autocomplete="one-time-code"]')).toBeVisible({ timeout: 15000 });
    await page.locator('input[autocomplete="one-time-code"]').fill(code);
    await page.getByRole('button', { name: 'Verify & Sign In', exact: true }).click();

    // 4. Confirm authenticated.
    await expectAuthenticated(page);

    // Capture the user id now (by email, as service-role) so step 10 can verify
    // deletion after the account — and its id — are gone.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const userId = list.users.find((u) => u.email === email)?.id;
    expect(userId, 'signed-up user should be findable by email').toBeTruthy();

    // 5. Create DB data via the UI: add a vocabulary word.
    await navButton(page, 'Vocabulary').click();
    // First "Add Word" button toggles the add form open.
    await page.getByRole('button', { name: 'Add Word' }).first().click();
    await page.getByPlaceholder('דבר').fill('שָׁלוֹם');
    await page.getByPlaceholder('word', { exact: true }).fill('peace');
    // The second "Add Word" button submits the form.
    await page.getByRole('button', { name: 'Add Word' }).last().click();
    await expect(page.getByText('שָׁלוֹם').first()).toBeVisible({ timeout: 15000 });

    // Confirm the row really landed in the DB (service-role).
    const seeded = await admin
      .from('vocabulary_words')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId!);
    expect(seeded.count).toBe(1);

    // 6. Log out.
    await navButton(page, 'Sign Out').click();
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 15000 });

    // 7. Log back in with the password.
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expectAuthenticated(page);

    // 8. Delete the account via the real Settings flow.
    await navButton(page, 'Settings').click();
    await page.getByRole('button', { name: 'Delete Account' }).first().click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await page.locator('#delete-confirmation').fill('DELETE');
    await dialog.getByRole('button', { name: 'Delete Account' }).click();

    // Deletion signs the user out → back to the Login screen.
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible({ timeout: 20000 });

    // 9. Log back in → must be REJECTED now that the account is gone.
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();

    // 10. As service-role, confirm the auth user AND all their data are gone.
    const { data: afterDelete } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    expect(afterDelete.users.some((u) => u.id === userId)).toBe(false);
    for (const table of ['vocabulary_words', 'word_statistics', 'user_tests'] as const) {
      const { count } = await admin
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!);
      expect(count ?? 0).toBe(0);
    }
  });
});
