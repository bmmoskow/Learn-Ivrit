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
