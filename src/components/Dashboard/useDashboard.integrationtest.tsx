import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext/AuthContext';
import { createTestUser, cleanupTestUser, TEST_USER_PASSWORD } from '@/test/testUser';
import { useDashboard } from './useDashboard';
// The hook (and AuthContext) talk to the root `supabase/client` instance, not
// `@/lib/supabase`. They share one localStorage auth key, so a sign-in on one is
// visible to the other. We import the SAME client the hook uses so the test can
// sign it in and seed rows over the exact path the app exercises in production.
import { supabase } from '../../../supabase/client';

// REAL-backend integration test for the Dashboard DATA LAYER (ACCOUNT mode only
// — the Dashboard is never shown to guests, who have no personalized data). It
// drives the actual `useDashboard` hook against the real database and asserts
// the thing a mocked test cannot: that the "weak words" query's EMBEDDED JOIN
// (`word_statistics -> vocabulary_words`) actually resolves. That embed depends
// on the real FK relationship; if a schema change broke it, only a real backend
// would catch it. All data is scoped to one helper-created user.
describe('useDashboard data-layer (real backend, account mode)', () => {
  let testUserId: string;

  // AuthProvider is the only context the hook needs (it reads `user` from
  // useAuth). No Router — the hook never navigates.
  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(async () => {
    const user = await createTestUser('dashboard');
    testUserId = user.userId;
    // Sign the hook's client in as this user too, so its JWT to PostgREST is
    // this test's user and AuthProvider resolves `user` to them.
    await supabase.auth.signInWithPassword({ email: user.email, password: TEST_USER_PASSWORD });
  });

  afterEach(async () => {
    // Self-scoped teardown (rows + auth user) for this user id — never global.
    await cleanupTestUser(testUserId);
    await supabase.auth.signOut();
  });

  // --- seed helpers (insert as the signed-in user, RLS-checked) ----------------

  async function seedWord(hebrew: string, english: string) {
    const { data, error } = await supabase
      .from('vocabulary_words')
      .insert({
        user_id: testUserId,
        hebrew_word: hebrew,
        english_translation: english,
        definition: `${english} — seeded by integration test`,
        transliteration: null,
      })
      .select()
      .single();
    expect(error).toBeNull();
    return data!;
  }

  async function seedStat(wordId: string, confidenceScore: number) {
    const { error } = await supabase.from('word_statistics').insert({
      user_id: testUserId,
      word_id: wordId,
      correct_count: 1,
      incorrect_count: 4,
      total_attempts: 5,
      consecutive_correct: 0,
      last_tested: new Date().toISOString(),
      confidence_score: confidenceScore,
    });
    expect(error).toBeNull();
  }

  async function seedTest(scorePercentage: number, completedAt: string) {
    const { error } = await supabase.from('user_tests').insert({
      user_id: testUserId,
      test_type: 'multiple_choice',
      total_questions: 10,
      correct_answers: Math.round(scorePercentage / 10),
      score_percentage: scorePercentage,
      duration_seconds: 120,
      completed_at: completedAt,
    });
    expect(error).toBeNull();
  }

  it('loads account stats, resolving the embedded weak-words join', async () => {
    // Three words, each with a statistics row of a different confidence_score so
    // we can assert weakest-first ordering and that the join resolved.
    const low = await seedWord('אֱלֹהִים', 'God');
    const mid = await seedWord('מֶלֶךְ', 'king');
    const high = await seedWord('שָׁלוֹם', 'peace');
    await seedStat(low.id, 20);
    await seedStat(mid.id, 50);
    await seedStat(high.id, 90);

    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    await seedTest(80, now.toISOString());
    await seedTest(60, twoDaysAgo.toISOString());

    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.stats.totalWords).toBe(3);
    });

    const { stats } = result.current;

    // The crux: the weak-words query embeds vocabulary_words via the FK. Each
    // weak word must carry its real Hebrew text (embed resolved) and a stats
    // object, ordered weakest-first by confidence_score. A mocked test cannot
    // prove this; a broken FK/embed would surface here and nowhere else.
    expect(stats.weakWords).toHaveLength(3);
    expect(stats.weakWords.map((w) => w.statistics.confidence_score)).toEqual([20, 50, 90]);
    expect(stats.weakWords[0].hebrew_word).toBe('אֱלֹהִים');
    expect(stats.weakWords.every((w) => typeof w.hebrew_word === 'string' && w.hebrew_word.length > 0)).toBe(true);

    // Recent tests: most-recent first, and the derived stats.
    expect(stats.recentTests).toHaveLength(2);
    expect(stats.recentTests[0].score_percentage).toBe(80); // the `now` test
    expect(stats.testsCompleted).toBe(2);
    expect(stats.averageScore).toBe(70); // round(avg(80, 60))
    expect(stats.studyStreak).toBeGreaterThanOrEqual(0);
  });

  it('returns zeroed stats (no error) for an account with no data', async () => {
    const { result } = renderHook(() => useDashboard(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    const { stats } = result.current;
    expect(stats.totalWords).toBe(0);
    expect(stats.testsCompleted).toBe(0);
    expect(stats.averageScore).toBe(0);
    expect(stats.studyStreak).toBe(0);
    expect(stats.weakWords).toEqual([]);
    expect(stats.recentTests).toEqual([]);
  });

  it('counts ALL historical tests, not just the 5 most recent (display still caps at 5)', async () => {
    // Six tests on six distinct days. The displayed "recent tests" list is
    // capped at 5, but the TOTALS (testsCompleted, averageScore) must cover the
    // full history — a .limit(5) on the query would wrongly report 5 here. This
    // is the regression guard for that undercount bug.
    const now = Date.now();
    const scores = [50, 60, 70, 80, 90, 100];
    for (let i = 0; i < scores.length; i++) {
      await seedTest(scores[i], new Date(now - i * 24 * 60 * 60 * 1000).toISOString());
    }

    const { result } = renderHook(() => useDashboard(), { wrapper });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.stats.testsCompleted).toBe(6);
    });

    const { stats } = result.current;
    expect(stats.testsCompleted).toBe(6); // full count, not capped at 5
    expect(stats.recentTests).toHaveLength(5); // display still capped
    expect(stats.recentTests[0].score_percentage).toBe(50); // most recent (today)
    expect(stats.averageScore).toBe(75); // round(avg 50..100) over ALL six
  });
});
