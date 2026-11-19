import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext/AuthContext';
import { createTestUser, cleanupTestUser, TEST_USER_PASSWORD } from '@/test/testUser';
import { useVocabularyList } from './useVocabularyList';
// The hook (and AuthContext) talk to the root `supabase/client` instance, NOT
// `@/lib/supabase`. They are two browser clients for the same project that
// share one localStorage auth key, so a sign-in on one is visible to the other.
// We import the SAME client the hook uses so the test can sign it in and seed
// rows over the exact code path the app exercises in production.
import { supabase } from '../../../supabase/client';

// REAL-backend integration test for the vocabulary DATA LAYER: it drives the
// actual `useVocabularyList` hook (via renderHook) against the real database —
// the local Docker sandbox locally, the isolated TEST project in CI — instead
// of calling `supabase` directly the way the DB/RLS-contract tests do. This is
// the gap these tests fill: the app's own hook between the UI and Supabase,
// exercised end to end (add → read back → update → delete), all scoped to a
// single helper-created user.
describe('useVocabularyList data-layer (real backend)', () => {
  let testUserId: string;
  let testEmail: string;

  // AuthProvider is the only context the hook needs (it reads `user`/`isGuest`
  // from useAuth). No Router is required — the hook itself never navigates.
  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  // Each test gets its own uniquely-named user (UUID-based, so two runs can
  // never collide) and is torn down afterwards, scoped to that user id.
  beforeEach(async () => {
    const user = await createTestUser('vocabhook');
    testUserId = user.userId;
    testEmail = user.email;
    // createTestUser already signed the helper's `@/lib/supabase` client in;
    // sign the hook's client in too so its in-memory session (and the JWT it
    // sends to PostgREST) is this test's user. This removes any ambiguity about
    // which session the hook queries under.
    await supabase.auth.signInWithPassword({ email: testEmail, password: TEST_USER_PASSWORD });
  });

  afterEach(async () => {
    // Helper deletes this user's rows (and, with a service-role key, the auth
    // user) scoped strictly to testUserId — never a global delete. Then clear
    // the hook client's own session so no stale identity leaks into the next test.
    await cleanupTestUser(testUserId);
    await supabase.auth.signOut();
    vi.restoreAllMocks();
  });

  // Insert a word over the real client as the signed-in user (RLS-checked) and
  // return its row. Used both as the subject under test and as a "readiness
  // sentinel": once the hook surfaces a seeded row we know AuthProvider has
  // resolved the user and the auth-backed load path ran.
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

  it('loads words that already exist in the database', async () => {
    await seedWord('שֶׁמֶשׁ', 'sun');
    await seedWord('יָרֵחַ', 'moon');

    const { result } = renderHook(() => useVocabularyList(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.words.map((w) => w.hebrew_word).sort()).toEqual(['יָרֵחַ', 'שֶׁמֶשׁ']);
    });
    expect(result.current.isGuest).toBe(false);
    expect(result.current.totalCount).toBe(2);
  });

  it('adds a word through the hook (addWord) and reads it back', async () => {
    // Sentinel proves the auth-backed load path is live before we act, so a
    // no-op addWord (which bails when `user` is null) can never masquerade as a
    // pass — if auth were not wired the sentinel would never appear and waitFor
    // would time out instead.
    await seedWord('שֶׁמֶשׁ', 'sun');
    const { result } = renderHook(() => useVocabularyList(), { wrapper });
    await waitFor(() => expect(result.current.words.some((w) => w.hebrew_word === 'שֶׁמֶשׁ')).toBe(true));

    act(() => {
      result.current.setNewWord({
        hebrew_word: 'תּוֹרָה',
        english_translation: 'Torah, teaching',
        definition: 'The Torah; instruction or teaching.',
        transliteration: 'torah',
      });
    });
    await act(async () => {
      await result.current.addWord();
    });

    await waitFor(() => expect(result.current.words.some((w) => w.hebrew_word === 'תּוֹרָה')).toBe(true));

    // Confirm it really landed in the database (not just local hook state).
    const { data } = await supabase
      .from('vocabulary_words')
      .select('*')
      .eq('user_id', testUserId)
      .eq('hebrew_word', 'תּוֹרָה');
    expect(data?.length).toBe(1);
    expect(data?.[0].english_translation).toBe('Torah, teaching');
  });

  it('updates a word through the hook (startEdit + saveEdit)', async () => {
    const seeded = await seedWord('אֱלֹהִים', 'God');
    const { result } = renderHook(() => useVocabularyList(), { wrapper });
    await waitFor(() => expect(result.current.words.some((w) => w.id === seeded.id)).toBe(true));

    const target = result.current.words.find((w) => w.id === seeded.id)!;
    act(() => {
      result.current.startEdit(target);
      result.current.setEditForm({
        hebrew_word: 'אֱלֹהִים',
        english_translation: 'God, gods',
        definition: 'God; the divine.',
      });
    });
    await act(async () => {
      await result.current.saveEdit();
    });

    await waitFor(() =>
      expect(result.current.words.find((w) => w.id === seeded.id)?.english_translation).toBe('God, gods'),
    );

    const { data } = await supabase.from('vocabulary_words').select('english_translation').eq('id', seeded.id).single();
    expect(data?.english_translation).toBe('God, gods');
  });

  it('deletes a word through the hook (deleteWord)', async () => {
    // deleteWord guards on window.confirm; accept it so the delete proceeds.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const seeded = await seedWord('מֶלֶךְ', 'king');
    const { result } = renderHook(() => useVocabularyList(), { wrapper });
    await waitFor(() => expect(result.current.words.some((w) => w.id === seeded.id)).toBe(true));

    await act(async () => {
      await result.current.deleteWord(seeded.id);
    });

    await waitFor(() => expect(result.current.words.some((w) => w.id === seeded.id)).toBe(false));

    const { data } = await supabase.from('vocabulary_words').select('id').eq('id', seeded.id);
    expect(data).toEqual([]);
  });
});

// REAL-backend integration tests for the vocabulary SORTING and SEARCHING paths,
// which are implemented as Supabase queries (server-side ordering + ilike), not
// client-side logic — so only a real backend can prove them. Same isolation as
// above: each test gets its own UUID-based user (RLS scopes every row to it, so
// concurrent runs never collide) and is torn down afterwards (cleanupTestUser
// removes this user's vocabulary_words AND word_statistics, scoped to the id).
describe('useVocabularyList sorting & searching (real backend)', () => {
  let testUserId: string;
  let testEmail: string;

  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(async () => {
    const user = await createTestUser('vocabsort');
    testUserId = user.userId;
    testEmail = user.email;
    await supabase.auth.signInWithPassword({ email: testEmail, password: TEST_USER_PASSWORD });
  });

  afterEach(async () => {
    await cleanupTestUser(testUserId);
    await supabase.auth.signOut();
    vi.restoreAllMocks();
  });

  // Insert one vocabulary row for this test's user. `createdAt` is set explicitly
  // when a test needs deterministic date ordering. Scoped strictly to testUserId.
  async function seedWord(opts: { hebrew: string; english: string; createdAt?: string }) {
    const { data, error } = await supabase
      .from('vocabulary_words')
      .insert({
        user_id: testUserId,
        hebrew_word: opts.hebrew,
        english_translation: opts.english,
        definition: `${opts.english} — seeded by integration test`,
        transliteration: null,
        ...(opts.createdAt ? { created_at: opts.createdAt } : {}),
      })
      .select()
      .single();
    expect(error).toBeNull();
    return data!;
  }

  // Insert a word_statistics row so the `vocabulary_with_stats` view has a
  // confidence_score to order by. Removed by cleanupTestUser (word_statistics is
  // one of its user-owned tables), scoped to testUserId.
  async function seedStats(wordId: string, confidence: number) {
    const { error } = await supabase.from('word_statistics').insert({
      user_id: testUserId,
      word_id: wordId,
      correct_count: 0,
      incorrect_count: 0,
      total_attempts: 0,
      consecutive_correct: 0,
      last_tested: null,
      confidence_score: confidence,
    });
    expect(error).toBeNull();
  }

  it('sorts by date added (newest first)', async () => {
    await seedWord({ hebrew: 'אור', english: 'light', createdAt: '2020-01-01T00:00:00Z' });
    await seedWord({ hebrew: 'בוקר', english: 'morning', createdAt: '2021-01-01T00:00:00Z' });
    await seedWord({ hebrew: 'גשר', english: 'bridge', createdAt: '2022-01-01T00:00:00Z' });

    const { result } = renderHook(() => useVocabularyList(), { wrapper });
    // Default sort is already 'date'; wait for this user's three rows to load.
    await waitFor(() => expect(result.current.words).toHaveLength(3));

    expect(result.current.words.map((w) => w.hebrew_word)).toEqual(['גשר', 'בוקר', 'אור']);
  });

  it('sorts alphabetically by Hebrew word (ascending)', async () => {
    await seedWord({ hebrew: 'גשר', english: 'bridge' });
    await seedWord({ hebrew: 'אור', english: 'light' });
    await seedWord({ hebrew: 'בוקר', english: 'morning' });

    const { result } = renderHook(() => useVocabularyList(), { wrapper });
    await waitFor(() => expect(result.current.words).toHaveLength(3));

    act(() => {
      result.current.setSortBy('alphabetical');
    });

    await waitFor(() => {
      expect(result.current.sortBy).toBe('alphabetical');
      // alef (אור) < bet (בוקר) < gimel (גשר)
      expect(result.current.words.map((w) => w.hebrew_word)).toEqual(['אור', 'בוקר', 'גשר']);
    });
  });

  it('sorts by performance (confidence ascending) via the stats view', async () => {
    const low = await seedWord({ hebrew: 'אחד', english: 'alpha' });
    const mid = await seedWord({ hebrew: 'שתיים', english: 'beta' });
    const high = await seedWord({ hebrew: 'שלוש', english: 'gamma' });
    await seedStats(low.id, 10);
    await seedStats(mid.id, 50);
    await seedStats(high.id, 90);

    const { result } = renderHook(() => useVocabularyList(), { wrapper });
    await waitFor(() => expect(result.current.words).toHaveLength(3));

    act(() => {
      result.current.setSortBy('performance');
    });

    await waitFor(() => {
      expect(result.current.sortBy).toBe('performance');
      // ascending confidence: 10 → 50 → 90
      expect(result.current.words.map((w) => w.id)).toEqual([low.id, mid.id, high.id]);
    });
  });

  it('searches by English substring (ilike), scoped to a run-unique token', async () => {
    // A run-unique token guarantees these ilike matches can never pick up a
    // concurrent run's rows (on top of the already user-scoped RLS).
    const token = `zq${crypto.randomUUID().slice(0, 8)}`;
    const a = await seedWord({ hebrew: 'תפוח', english: `${token}-apple` });
    const b = await seedWord({ hebrew: 'בננה', english: `${token}-banana` });
    await seedWord({ hebrew: 'מכונית', english: 'car' }); // does NOT contain the token

    const { result } = renderHook(() => useVocabularyList(), { wrapper });
    await waitFor(() => expect(result.current.words).toHaveLength(3));

    act(() => {
      result.current.setSearchQuery(token);
    });

    await waitFor(() => {
      expect(result.current.words.map((w) => w.id).sort()).toEqual([a.id, b.id].sort());
    });
  });

  it('searches by Hebrew substring (ilike)', async () => {
    const soup = await seedWord({ hebrew: 'מרק', english: 'soup' });
    await seedWord({ hebrew: 'תפוח', english: 'apple' }); // no 'מרק'

    const { result } = renderHook(() => useVocabularyList(), { wrapper });
    await waitFor(() => expect(result.current.words).toHaveLength(2));

    act(() => {
      result.current.setSearchQuery('מרק');
    });

    await waitFor(() => {
      expect(result.current.words.map((w) => w.id)).toEqual([soup.id]);
    });
  });
});
