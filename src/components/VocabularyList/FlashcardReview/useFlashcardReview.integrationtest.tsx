import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext/AuthContext';
import { createTestUser, cleanupTestUser, TEST_USER_PASSWORD } from '@/test/testUser';
import { useFlashcardReview } from './useFlashcardReview';
// Same root client the hook and AuthContext use — see the note in
// useTestPanel.integrationtest.tsx for why this is not `@/lib/supabase`.
import { supabase } from '../../../../supabase/client';

// REAL-backend integration test for the Vocabulary flashcard review, exercised
// through the actual `useFlashcardReview` hook end to end against the local
// sandbox (or the isolated test project in CI). This mode is the mirror image of
// the TestPanel: it READS the same adaptive selection (`select_test_words`) but
// must NEVER write. The two tests below pin both halves of that contract:
//   1. A full flip-through session writes nothing to user_tests / test_responses
//      / word_statistics — the whole reason flashcards moved out of the tests.
//   2. The deck the hook surfaces carries the user's real persisted statistics,
//      proving the adaptive read path goes all the way to the database.
// Everything is scoped to one helper-created user.
describe('useFlashcardReview (real backend)', () => {
  let testUserId: string;
  let testEmail: string;

  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  const WORDS = [
    { hebrew: 'סֵפֶר', english: 'book' },
    { hebrew: 'עֵץ', english: 'tree' },
    { hebrew: 'מַיִם', english: 'water' },
    { hebrew: 'אֶרֶץ', english: 'land' },
  ];

  // Count the rows a scoring test would have written, scoped to this user.
  async function writeRowCounts() {
    const [tests, responses, stats] = await Promise.all([
      supabase.from('user_tests').select('id', { count: 'exact', head: true }).eq('user_id', testUserId),
      supabase.from('test_responses').select('id', { count: 'exact', head: true }).eq('user_id', testUserId),
      supabase.from('word_statistics').select('id', { count: 'exact', head: true }).eq('user_id', testUserId),
    ]);
    return {
      userTests: tests.count ?? 0,
      testResponses: responses.count ?? 0,
      wordStatistics: stats.count ?? 0,
    };
  }

  beforeEach(async () => {
    const user = await createTestUser('flashcardreview');
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
    // Scoped teardown via the helper (rows + auth user), strictly by user id.
    await cleanupTestUser(testUserId);
    await supabase.auth.signOut();
  });

  it('flips through a whole session through the hook and writes nothing', async () => {
    // Nothing is written yet: a fresh user has no tests/responses/stats.
    const before = await writeRowCounts();
    expect(before).toEqual({ userTests: 0, testResponses: 0, wordStatistics: 0 });

    const { result } = renderHook(() => useFlashcardReview(), { wrapper });

    // The authed adaptive load must surface the seeded deck before we drive it.
    // REVIEW_WORD_COUNT (20) exceeds the 4 seeded words, so the deck is all of
    // them — a no-op load (which would leave words empty) can't pass silently.
    await waitFor(() => expect(result.current.words.length).toBe(WORDS.length));
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.showAnswer).toBe(false);

    // The deck is scoped to this user's own words (RLS) — nothing leaked in.
    const seededEnglish = new Set(WORDS.map((w) => w.english));
    expect(result.current.words.every((w) => seededEnglish.has(w.english_translation))).toBe(true);

    // Walk the entire deck the way a learner would: reveal, re-hide, advance —
    // all the way to the last card and part of the way back. Every one of these
    // is a pure cursor/flip action with no persistence behind it.
    while (result.current.hasNext) {
      act(() => result.current.revealAnswer());
      expect(result.current.showAnswer).toBe(true);
      act(() => result.current.hideAnswer());
      expect(result.current.showAnswer).toBe(false);
      act(() => result.current.goToNext());
    }
    // On the last card now; reveal it, then step back through to the start.
    act(() => result.current.revealAnswer());
    while (result.current.hasPrevious) {
      act(() => result.current.goToPrevious());
    }
    expect(result.current.currentIndex).toBe(0);

    // The contract: a full review session is invisible to the scoring tables.
    const after = await writeRowCounts();
    expect(after).toEqual({ userTests: 0, testResponses: 0, wordStatistics: 0 });
  });

  it('surfaces each word\'s persisted statistics (reads the adaptive stats)', async () => {
    // Give every seeded word a distinct, known confidence so we can prove the
    // hook read the real stats back (not a default/zeroed stub). Lower
    // confidence = weaker word; the RPC ranks by it, the hook then shuffles.
    const { data: vocab, error: vocabErr } = await supabase
      .from('vocabulary_words')
      .select('id, english_translation')
      .eq('user_id', testUserId);
    expect(vocabErr).toBeNull();
    expect(vocab?.length).toBe(WORDS.length);

    // Map english -> a deterministic confidence, and insert matching stats rows.
    const confidenceByEnglish: Record<string, number> = {
      book: 10,
      tree: 35,
      water: 60,
      land: 85,
    };
    const { error: statsErr } = await supabase.from('word_statistics').insert(
      (vocab ?? []).map((v) => ({
        user_id: testUserId,
        word_id: v.id,
        total_attempts: 5,
        correct_count: 3,
        incorrect_count: 2,
        consecutive_correct: 1,
        confidence_score: confidenceByEnglish[v.english_translation],
      })),
    );
    expect(statsErr).toBeNull();

    const { result } = renderHook(() => useFlashcardReview(), { wrapper });
    await waitFor(() => expect(result.current.words.length).toBe(WORDS.length));

    // Every card in the deck carries the exact confidence we persisted for it,
    // so the read went through `select_test_words` to the database and back.
    for (const word of result.current.words) {
      const expected = confidenceByEnglish[word.english_translation];
      expect(Number(word.statistics?.confidence_score)).toBe(expected);
      expect(word.statistics?.total_attempts).toBe(5);
    }
  });
});
