import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Shared helper for REAL-backend integration tests (*.integrationtest.tsx). Gives
// every test its own isolated, uniquely-named user and cleans up after itself,
// so that:
//   1. No two tests — even across two test runs firing at the same moment on
//      different machines/CI — ever use the same data (identities are UUID-based,
//      not timestamp-based, so they cannot collide).
//   2. Each test's data is removed afterwards, scoped strictly to its own user
//      id (never a global truncate), so one run's cleanup can never touch a
//      concurrent run's data.
// Only ever used by integration tests against the local sandbox / isolated test
// project — never prod (the integration config's prod-guard enforces the target).

// Not a secret — these users exist only in the local sandbox / test project.
export const TEST_USER_PASSWORD = 'TestPassword123!';

// Tables keyed by user_id. Deleted explicitly in the no-service-role fallback;
// the service-role path relies on ON DELETE CASCADE from auth.users instead.
const USER_OWNED_TABLES = ['vocabulary_words'] as const;

export interface TestUser {
  email: string;
  password: string;
  userId: string;
}

/**
 * A globally-unique test email. Uses crypto.randomUUID() (NOT a timestamp) so
 * two tests cannot generate the same identity even if they run in the same
 * millisecond on different machines — the core of cross-run isolation.
 */
export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${crypto.randomUUID()}@example.com`;
}

// Service-role admin client, or null when no SUPABASE_SERVICE_ROLE_KEY is set.
// Reuses the SAME guarded URL as the anon client (the integration config has
// already proven it is localhost or the allow-listed test ref), so it can never
// reach prod. Lazily created and memoized.
let admin: SupabaseClient | null | undefined;
function getAdminClient(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  // Injected via the integration config's `test.env` (vitest exposes it on
  // import.meta.env). Same guarded URL as the anon client — never prod.
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  admin =
    url && serviceRoleKey
      ? createClient(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return admin;
}

/** True when full auth-user cleanup is possible (a service-role key is set). */
export function canDeleteAuthUsers(): boolean {
  return getAdminClient() !== null;
}

/**
 * Create a brand-new, uniquely-named user via the real auth endpoint and leave
 * the anon client signed in as them. Throws if signup fails (a test should not
 * continue against a user that was never created).
 */
export async function createTestUser(prefix = 'test'): Promise<TestUser> {
  const email = uniqueEmail(prefix);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: TEST_USER_PASSWORD,
  });
  if (error) throw new Error(`createTestUser(${prefix}) failed: ${error.message}`);
  const userId = data.user?.id;
  if (!userId) throw new Error(`createTestUser(${prefix}) returned no user id`);
  return { email, password: TEST_USER_PASSWORD, userId };
}

let warnedNoAdmin = false;

/**
 * Remove everything a test created, scoped to ONE user id — never a global
 * delete, so a concurrent run's data is never touched. Deletes the user's rows
 * and, when a service-role key is available, the auth user itself (cascading any
 * remaining rows). Without a service-role key it deletes the known user-owned
 * rows and signs out, leaving the harmless, uniquely-named auth user (warned
 * once — run `npm run sandbox:env` locally, or set the CI secret, for full
 * cleanup). Best-effort and never throws, so a cleanup hiccup can't fail a test.
 *
 * Pass `undefined` when a test created no user (just signs out safely).
 */
export async function cleanupTestUser(userId: string | undefined): Promise<void> {
  try {
    if (userId) {
      // Delete owned rows via the authed anon session (RLS lets a user delete
      // their own rows), so cleanup works even without a service-role key.
      for (const table of USER_OWNED_TABLES) {
        await supabase.from(table).delete().eq('user_id', userId);
      }

      const adminClient = getAdminClient();
      if (adminClient) {
        await adminClient.auth.admin.deleteUser(userId);
      } else if (!warnedNoAdmin) {
        warnedNoAdmin = true;
        console.warn(
          '[testUser] No SUPABASE_SERVICE_ROLE_KEY set — cleaning test rows but ' +
            'leaving auth users. Run `npm run sandbox:env` (local) or set the ' +
            'SUPABASE_SERVICE_ROLE_KEY secret (CI) for full user cleanup.',
        );
      }
    }
    await supabase.auth.signOut();
  } catch (error) {
    // Best-effort: a failed cleanup must not fail the test run.
    console.error('[testUser] cleanup error:', error);
  }
}
