import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext/AuthContext';
import { createTestUser, cleanupTestUser, TEST_USER_PASSWORD } from '@/test/testUser';
import { useTestPanel } from './useTestPanel';
// Same root client the hook and AuthContext use — see the note in
// useVocabularyList.integrationtest.tsx for why this is not `@/lib/supabase`.
import { supabase } from '../../../supabase/client';

// REAL-backend integration test for test-taking + adaptive persistence,
// exercised through the actual `useTestPanel` hook end to end. Starting a test
// runs the `select_test_words` RPC (the stats READ path) and finishing one runs
// the `save_complete_test_results` RPC, which writes `user_tests`,
// `test_responses` and `word_statistics` in a single transaction (the WRITE
// path for priorities 2 & 3). Everything is scoped to one helper-created user.
describe('useTestPanel persistence (real backend)', () => {
  let testUserId: string;
  let testEmail: string;

  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  const WORDS = [
    { hebrew: 'סֵפֶר', english: 'book' },
    { hebrew: 'עֵץ', english: 'tree' },
    { hebrew: 'מַיִם', english: 'water' },
    { hebrew: 'אֶרֶץ', english: 'land' },
  ];

  beforeEach(async () => {
    const user = await createTestUser('testpanel');
    testUserId = user.userId;
    testEmail = user.email;
    await supabase.auth.signInWithPassword({ email: testEmail, password: TEST_USER_PASSWORD });

    // Seed the user's vocabulary directly over the real client (RLS-checked).
    const { error } = await supabase.from('vocabulary_words').insert(
      WORDS.map((w) => ({
        user_id: testUserId,
        hebrew_word: w.hebrew,
        english_translation: w.english,
        definition: `${w.english} — seeded by integration test`,
        transliteration: null,
      })),
    );
    expect(error).toBeNull();
  });

  afterEach(async () => {
    // Scoped teardown via the helper (rows + auth user). The helper now also
    // clears user_tests / test_responses / word_statistics for this user id.
    await cleanupTestUser(testUserId);
    await supabase.auth.signOut();
  });

  it('runs a full test through the hook and persists results across all three tables', async () => {
    const { result } = renderHook(() => useTestPanel(), { wrapper });

    // Readiness: the auth-backed vocabulary load must surface all seeded words
    // before we start. A no-op start (which bails when words are empty) can
    // therefore never pass silently.
    await waitFor(() => expect(result.current.words.length).toBe(WORDS.length));

    act(() => {
      result.current.setQuestionCount(WORDS.length);
    });

    // startTest calls the `select_test_words` RPC and builds the question set.
    await act(async () => {
      await result.current.startTest('multiple_choice');
    });

    const questionCount = result.current.currentTest.length;
    expect(questionCount).toBe(WORDS.length);

    // Answer every question correctly via the real handler. The final answer
    // triggers finishTest, which (after a 2s results-display delay) fires the
    // save RPC.
    for (let i = 0; i < questionCount; i++) {
      const question = result.current.currentQuestion!;
      const correctAnswer = question.word.english_translation;
      await act(async () => {
        result.current.handleAnswer(correctAnswer, true);
      });
    }

    // finishTest's 2s min-display delay + the async save RPC — allow headroom.
    await waitFor(() => expect(result.current.showResults).toBe(true), { timeout: 10000 });
    await waitFor(() => expect(result.current.testId).not.toBeNull(), { timeout: 10000 });

    const savedTestId = result.current.testId!;

    // user_tests: exactly one row for this test, perfect score.
    const { data: tests, error: testsErr } = await supabase
      .from('user_tests')
      .select('*')
      .eq('user_id', testUserId);
    expect(testsErr).toBeNull();
    expect(tests?.length).toBe(1);
    expect(tests?.[0].id).toBe(savedTestId);
    expect(tests?.[0].test_type).toBe('multiple_choice');
    expect(tests?.[0].total_questions).toBe(questionCount);
    expect(tests?.[0].correct_answers).toBe(questionCount);
    expect(Number(tests?.[0].score_percentage)).toBe(100);

    // test_responses: one per question, linked to the saved test, all correct.
    const { data: responses, error: respErr } = await supabase
      .from('test_responses')
      .select('*')
      .eq('user_id', testUserId);
    expect(respErr).toBeNull();
    expect(responses?.length).toBe(questionCount);
    expect(responses?.every((r) => r.test_id === savedTestId)).toBe(true);
    expect(responses?.every((r) => r.is_correct === true)).toBe(true);

    // word_statistics: one upserted row per tested word. A single correct
    // attempt on a brand-new word yields confidence 100 * 0.8 (the <5-attempts
    // penalty) = 80 (see calculateConfidenceScore).
    const { data: stats, error: statsErr } = await supabase
      .from('word_statistics')
      .select('*')
      .eq('user_id', testUserId);
    expect(statsErr).toBeNull();
    expect(stats?.length).toBe(questionCount);
    expect(stats?.every((s) => s.total_attempts === 1)).toBe(true);
    expect(stats?.every((s) => s.correct_count === 1)).toBe(true);
    expect(stats?.every((s) => s.consecutive_correct === 1)).toBe(true);
    expect(stats?.every((s) => Number(s.confidence_score) === 80)).toBe(true);
  });

  it('reads persisted word_statistics back through the hook (select_test_words)', async () => {
    const { result } = renderHook(() => useTestPanel(), { wrapper });
    await waitFor(() => expect(result.current.words.length).toBe(WORDS.length));

    act(() => {
      result.current.setQuestionCount(WORDS.length);
    });

    // First run: answer everything correctly so stats get written.
    await act(async () => {
      await result.current.startTest('flashcard');
    });
    const firstCount = result.current.currentTest.length;
    for (let i = 0; i < firstCount; i++) {
      const question = result.current.currentQuestion!;
      await act(async () => {
        result.current.handleAnswer(question.word.english_translation, true);
      });
    }
    await waitFor(() => expect(result.current.testId).not.toBeNull(), { timeout: 10000 });

    // Reset clears in-memory test state and reloads vocabulary.
    act(() => {
      result.current.resetTest();
    });
    await waitFor(() => expect(result.current.words.length).toBe(WORDS.length));

    // Second start re-runs select_test_words, whose `stats` column now carries
    // the persisted statistics. mapRpcWordToWordWithStats surfaces them on each
    // question's word — so the hook read the real stats we just wrote.
    await act(async () => {
      await result.current.startTest('flashcard');
    });
    expect(result.current.currentTest.length).toBe(WORDS.length);
    expect(result.current.currentTest.every((q) => q.word.statistics?.total_attempts === 1)).toBe(true);
    expect(result.current.currentTest.every((q) => Number(q.word.statistics?.confidence_score) === 80)).toBe(true);
  });
});
