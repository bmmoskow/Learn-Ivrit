import { describe, it, expect, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
// Single client throughout, the same one the test-user helper uses, so its
// sign-in/out state and the safety-net cleanup all act on one session. It shares
// the project's localStorage auth key with the app's other client, exactly as in
// the running app.
import { supabase } from '@/lib/supabase';
import { uniqueEmail, cleanupTestUser, TEST_USER_PASSWORD } from '@/test/testUser';
import { getSignupOtp } from '@/test/inbucket';

// FULL sign-up → emailed-code → use → delete round-trip, against a REAL local
// stack with email confirmations ON. This is its own test type (*.roundtriptest):
// it exercises the genuine OTP path the normal suites skip (they auto-confirm),
// reading the 6-digit code back from the local mailbox. Local-only by design —
// the config's guard enforces a localhost target.
//
// The ten steps the product owner enumerated:
//   1 sign up  2 get the code emailed  3 apply the code  4 confirm authenticated
//   5 create DB data  6 log out  7 log back in (confirm auth)  8 delete account
//   9 log back in (confirm rejection)  10 confirm user + data gone from the DB.

const SERVICE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

describe('sign-up round-trip (real local backend + emailed OTP)', () => {
  const email = uniqueEmail('signup-roundtrip');
  let userId: string | undefined;

  // Service-role client for the post-deletion checks (step 10): once the account
  // is gone, the anon session can no longer read anything, so deletion can only
  // be verified with elevated privileges. Lives only on the local stack.
  const admin: SupabaseClient | null = SERVICE_KEY
    ? createClient(SERVICE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  afterAll(async () => {
    // Safety net: if the round-trip bailed before the delete step, don't leave a
    // user (or its rows) behind. A no-op once the account was already deleted.
    await cleanupTestUser(userId);
  });

  it('signs up, verifies the emailed code, uses the account, then deletes it', async () => {
    expect(
      admin,
      'This suite needs SUPABASE_SERVICE_ROLE_KEY to verify deletion — run `npm run sandbox:env`.',
    ).not.toBeNull();

    // 1. Sign up. With confirmations ON there is no session yet; a code is emailed.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: TEST_USER_PASSWORD,
    });
    expect(signUpError).toBeNull();
    userId = signUpData.user?.id;
    expect(userId).toBeTruthy();
    expect(signUpData.session).toBeNull(); // not authenticated until confirmed

    // 2. Read the emailed 6-digit code out of the local mailbox.
    const code = await getSignupOtp(email, { timeoutMs: 20000 });
    expect(code).toMatch(/^\d{6}$/);

    // 3. Apply the code — the exact call the app's useLogin verify step makes.
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup',
    });
    expect(verifyError).toBeNull();
    expect(verifyData.session).not.toBeNull();

    // 4. Confirm we are truly authenticated as this user.
    const { data: sessionData } = await supabase.auth.getSession();
    expect(sessionData.session?.user.id).toBe(userId);

    // 5. Do activity that creates data on the DB (RLS-checked as this user).
    const { error: vocabErr } = await supabase.from('vocabulary_words').insert({
      user_id: userId!,
      hebrew_word: 'שָׁלוֹם',
      english_translation: 'peace',
      definition: 'peace — seeded by the sign-up round-trip test',
      transliteration: null,
    });
    expect(vocabErr).toBeNull();
    const { error: testErr } = await supabase.from('user_tests').insert({
      user_id: userId!,
      test_type: 'multiple_choice',
      total_questions: 5,
      correct_answers: 4,
      score_percentage: 80,
      duration_seconds: 60,
      completed_at: new Date().toISOString(),
    });
    expect(testErr).toBeNull();
    const { count: seededWords } = await supabase
      .from('vocabulary_words')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId!);
    expect(seededWords).toBe(1);

    // 6. Log out.
    await supabase.auth.signOut();
    const { data: afterSignOut } = await supabase.auth.getSession();
    expect(afterSignOut.session).toBeNull();

    // 7. Log back in with the password; confirm authenticated.
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: TEST_USER_PASSWORD,
    });
    expect(signInError).toBeNull();
    expect(signInData.session?.user.id).toBe(userId);

    // 8. Delete the account via the real self-service RPC.
    const { data: deleteData, error: deleteError } = await supabase.rpc('delete_user_account');
    expect(deleteError).toBeNull();
    expect((deleteData as { success?: boolean } | null)?.success).toBe(true);
    await supabase.auth.signOut(); // the session's user no longer exists

    // 9. Log back in → must be REJECTED now that the account is gone.
    const { data: rejectedData, error: rejectedError } = await supabase.auth.signInWithPassword({
      email,
      password: TEST_USER_PASSWORD,
    });
    expect(rejectedError).not.toBeNull();
    expect(rejectedData.session).toBeNull();

    // 10. As service-role, confirm the auth user AND all their data are gone.
    const { data: lookedUp } = await admin!.auth.admin.getUserById(userId!);
    expect(lookedUp.user).toBeNull();
    for (const table of ['vocabulary_words', 'word_statistics', 'user_tests'] as const) {
      const { count } = await admin!
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!);
      expect(count ?? 0).toBe(0);
    }

    // The account is gone; nothing for the afterAll safety net to clean up.
    userId = undefined;
  });
});
