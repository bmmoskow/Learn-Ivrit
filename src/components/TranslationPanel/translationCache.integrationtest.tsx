import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext/AuthContext';
import { createTestUser, cleanupTestUser, TEST_USER_PASSWORD } from '@/test/testUser';
import { hashUserId } from '@/utils/hashId/hashUserId';
import { useTranslationPanel } from './useTranslationPanel';
// Use the EXACT hashing the client cache path uses, so the key we seed is
// byte-for-byte the key the hook computes. generateContentHash is SHA-256 hex of
// its input, identical to the edge function's `hashText` in
// supabase/functions/gemini-translate/shared.ts.
import { generateContentHash } from './translationPanelUtils';
// The hook (and AuthContext) talk to the root `supabase/client` instance, NOT
// `@/lib/supabase`. They share one localStorage auth key, so a sign-in on one is
// visible to the other. We import the SAME client the hook uses so the test
// signs in over the exact path the app exercises in production.
import { supabase } from '../../../supabase/client';

// REAL-backend integration test for the TRANSLATION CACHE, exercised end to end
// through the actual `useTranslationPanel` hook against the real sandbox.
//
// ARCHITECTURE NOTE (verified against the code, Nov 2026 — please re-check if the
// cache is ever refactored):
//   The translation cache is a SPLIT read/write design, NOT a single server-side
//   lookup:
//     • WRITE (server-side): the `gemini-translate` edge function's
//       `handleTranslate` (translate.ts) ALWAYS calls Gemini on a request and
//       then INSERTs the result into `translation_cache` (cacheTranslation()).
//       It does NOT read the cache and does NOT short-circuit on a hit.
//     • READ / hit short-circuit (CLIENT-side): `translateChunk` inside
//       `useTranslationPanel.ts` SELECTs `translation_cache` by `content_hash`
//       BEFORE calling the edge function. On a hit it returns the cached
//       translation WITHOUT invoking the edge function (so NO Gemini call) and
//       writes an `api_usage_logs` row with `cache_hit = true`, zero token
//       counts, and model `"cache"`.
//   Because the hit logic lives in the hook, the only faithful way to test "a
//   cached entry is served without hitting Gemini" is THROUGH the hook — which is
//   also how every other integration test in this repo drives its code. Invoking
//   the edge function directly would only ever exercise the write path.
//
// Cache key (both sides, verified): SHA-256 hex of
//   `${sourceLanguage}->${targetLanguage}:${text}`
// For a "hebrew-to-english" translation that is `Hebrew->English:${text}`.
//
// RLS (verified in supabase/migrations/20260925184510_baseline_prod_schema.sql
// and schema-export.sql): `translation_cache` INSERT/UPDATE/DELETE are
// service-role-only (authenticated may only SELECT), and `api_usage_logs` SELECT
// is admin-only with no authenticated DELETE. So both seeding the cache row and
// reading/cleaning the usage logs require the SERVICE-ROLE client. When no
// service-role key is configured the whole suite is skipped (it cannot seed).

// Service-role admin client (bypasses RLS). Built the same way the test-user
// helper builds its internal admin client: same guarded URL as the anon client
// (the integration config has already proven it is localhost or the allow-listed
// test ref), so it can never reach prod. `null` when no service-role key is set.
function makeAdminClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const admin = makeAdminClient();

// A fresh, globally-unique single-paragraph Hebrew string (no double newline, so
// translateText produces exactly ONE chunk and thus ONE cache key). The UUID
// guarantees this exact text has never been cached before.
function uniqueHebrewText(): string {
  return `שלום עולם בדיקה ${crypto.randomUUID()}`;
}

const DIRECTION = 'hebrew-to-english' as const;
// translateText maps "hebrew-to-english" to these languages (see useTranslationPanel).
function cacheKeyFor(text: string): Promise<string> {
  return generateContentHash(`Hebrew->English:${text}`);
}

// Matches the credentials/quota failure modes the sandbox edge function can
// surface when it has no (or an exhausted) Gemini key. Used to SKIP the
// populate→hit round-trip rather than fail it when Gemini is unavailable.
const CREDENTIALS_OR_QUOTA = /RESOURCE_EXHAUSTED|quota|api key|api_key|credential|unauthor|permission denied|Gemini API error|rate limit|\b40[12]\b|\b429\b|\b503\b|budget/i;

// describe.skipIf keeps the suite green on a machine with no service-role key
// (it cannot seed the service-role-only cache table at all).
describe.skipIf(!admin)('translation cache (real backend, through useTranslationPanel)', () => {
  let testUserId: string;
  let hashedUserId: string;
  // content_hash rows this test created, to delete in teardown (service-role only).
  const seededHashes = new Set<string>();

  // AuthProvider is the only context the hook needs (it reads `user`/`isGuest`
  // from useAuth). No Router — the hook never navigates.
  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(async () => {
    const user = await createTestUser('transcache');
    testUserId = user.userId;
    // api_usage_logs stores a SHA-256 hash of the user id (privacy), so this is
    // the key we filter/clean usage-log rows by.
    hashedUserId = await hashUserId(testUserId);
    // Sign the hook's client in as this user so its JWT to PostgREST is this
    // test's user and AuthProvider resolves `user` to them.
    await supabase.auth.signInWithPassword({ email: user.email, password: TEST_USER_PASSWORD });
  });

  afterEach(async () => {
    // Self-scoped teardown, all via the service-role client (authenticated users
    // cannot DELETE these rows). Never a global truncate.
    if (admin) {
      for (const hash of seededHashes) {
        await admin.from('translation_cache').delete().eq('content_hash', hash);
      }
      await admin.from('api_usage_logs').delete().eq('user_id', hashedUserId);
      // translateText logs one gemini_api_rate_limits row per article for an
      // authed user; clear it defensively (user cascade would also cover it).
      await admin.from('gemini_api_rate_limits').delete().eq('user_id', testUserId);
    }
    seededHashes.clear();
    await cleanupTestUser(testUserId);
    await supabase.auth.signOut();
  });

  // ---------------------------------------------------------------------------
  // TEST 1 — deterministic cache HIT. Needs NO Gemini key: the client short-
  // circuits on the seeded row and never calls the edge function.
  // ---------------------------------------------------------------------------
  it('serves a seeded cache entry without calling Gemini and logs a cache hit', async () => {
    const text = uniqueHebrewText();
    const seededTranslation = `SEEDED TRANSLATION ${crypto.randomUUID()}`;
    const contentHash = await cacheKeyFor(text);
    seededHashes.add(contentHash);

    // Seed the cache row EXACTLY as the edge function would write it (same
    // columns as cacheTranslation() in translate.ts), via service role.
    const { error: seedError } = await admin!.from('translation_cache').insert({
      content_hash: contentHash,
      hebrew_text: text.substring(0, 5000),
      translation: seededTranslation,
      text_length: text.length,
      cached_at: new Date().toISOString(),
      last_accessed: new Date().toISOString(),
      access_count: 0,
    });
    expect(seedError).toBeNull();

    const { result } = renderHook(() => useTranslationPanel(), { wrapper });

    // Translate the seeded input. Because the row exists, translateChunk returns
    // the cached translation and never fetches the edge function.
    await act(async () => {
      await result.current.translateText(text, DIRECTION);
    });

    // The hook surfaced the SEEDED value verbatim (proves the cache was read and
    // Gemini was not called — a live call would have returned different text).
    await waitFor(() => {
      expect(result.current.translatedText).toBe(seededTranslation);
    });
    expect(result.current.error).toBe('');

    // A cache-hit usage log was written: cache_hit = true, ZERO Gemini tokens,
    // model "cache". The insert is fire-and-forget in the hook, so poll for it.
    await waitFor(async () => {
      const { data, error } = await admin!
        .from('api_usage_logs')
        .select('*')
        .eq('user_id', hashedUserId)
        .eq('cache_hit', true);
      expect(error).toBeNull();
      expect(data && data.length).toBeGreaterThanOrEqual(1);
      const hit = data![0];
      expect(hit.cache_hit).toBe(true);
      expect(hit.endpoint).toBe('/translate');
      expect(hit.request_type).toBe('translate');
      expect(hit.model).toBe('cache');
      expect(hit.prompt_tokens).toBe(0);
      expect(hit.candidates_tokens).toBe(0);
      expect(hit.thinking_tokens).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST 2 — populate → hit round-trip. Makes AT MOST ONE real Gemini call (the
  // first, populating, invocation). The second invocation is served from cache.
  //
  // This depends on the sandbox edge function having valid Gemini credentials,
  // which this (Dockerless) author cannot verify. If the FIRST invocation fails
  // with a credentials/quota error, the test SKIPS rather than failing.
  // ---------------------------------------------------------------------------
  it('populates the cache on a miss, then serves the second request from cache', async (ctx) => {
    const text = uniqueHebrewText();
    const contentHash = await cacheKeyFor(text);
    seededHashes.add(contentHash); // ensure teardown removes whatever gets written

    // Precondition: this text is genuinely NOT cached yet.
    const { data: before } = await admin!
      .from('translation_cache')
      .select('id')
      .eq('content_hash', contentHash);
    expect(before?.length ?? 0).toBe(0);

    const { result } = renderHook(() => useTranslationPanel(), { wrapper });

    // ---- First invocation: cache MISS -> edge function -> Gemini (1 call) ----
    await act(async () => {
      await result.current.translateText(text, DIRECTION);
    });
    await waitFor(() => expect(result.current.translating).toBe(false));

    // If Gemini credentials/quota are unavailable in this sandbox, skip rather
    // than fail — we cannot exercise the real populate path without a live call.
    const err = result.current.error;
    if (err && CREDENTIALS_OR_QUOTA.test(err)) {
      ctx.skip(`Gemini unavailable in sandbox; skipping populate->hit round-trip. Edge error: ${err}`);
      return;
    }
    // Any OTHER error is a real failure.
    expect(err).toBe('');
    expect(result.current.translatedText.trim().length).toBeGreaterThan(0);

    // The edge function populated the cache for this exact key.
    await waitFor(async () => {
      const { data, error } = await admin!
        .from('translation_cache')
        .select('content_hash, translation')
        .eq('content_hash', contentHash);
      expect(error).toBeNull();
      expect(data?.length).toBe(1);
      expect((data![0].translation as string).length).toBeGreaterThan(0);
    });

    // ---- Second invocation: same text -> cache HIT (no Gemini call) ----
    await act(async () => {
      await result.current.translateText(text, DIRECTION);
    });
    await waitFor(() => expect(result.current.translating).toBe(false));
    expect(result.current.error).toBe('');

    // A cache-hit usage log now exists for this user: cache_hit = true, zero
    // tokens, model "cache". (The first, miss, call logged cache_hit = false
    // from the edge function; this asserts the SECOND call was served from cache.)
    await waitFor(async () => {
      const { data, error } = await admin!
        .from('api_usage_logs')
        .select('*')
        .eq('user_id', hashedUserId)
        .eq('cache_hit', true);
      expect(error).toBeNull();
      expect(data && data.length).toBeGreaterThanOrEqual(1);
      const hit = data![0];
      expect(hit.model).toBe('cache');
      expect(hit.candidates_tokens).toBe(0);
      expect(hit.thinking_tokens).toBe(0);
    });
  });
});
