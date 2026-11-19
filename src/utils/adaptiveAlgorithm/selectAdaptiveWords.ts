/**
 * Shared adaptive word-selection helper.
 *
 * This is the SINGLE place that decides which words to surface for an adaptive
 * drill — used by both the TestPanel (objective tests that write stats) and the
 * Vocabulary flashcard review (practice only, no writes). Centralising it means
 * both features drill the exact same weak words:
 *   - Authenticated users go through the `select_test_words` RPC, which ranks a
 *     user's words server-side by their persisted statistics/confidence.
 *   - Guests have no server stats, so they fall back to the pure `selectTestWords`
 *     util over the in-memory word pool (seeded from `defaultVocabulary`).
 *
 * Unlike `adaptiveAlgorithmUtils` (which is intentionally dependency-free so it
 * can be unit tested without mocks), this module reaches for the Supabase client,
 * so it lives in its own file.
 */

import { supabase } from "../../../supabase/client";
import type { Tables } from "../../../supabase/types";
import { selectTestWords, shuffleArray, WordWithStats } from "./adaptiveAlgorithmUtils";

/**
 * Maps a row returned by the `select_test_words` RPC to the WordWithStats shape.
 * The RPC nests the per-word statistics under a `stats` column; the rest of the
 * app expects them on a `statistics` property.
 */
export function mapRpcWordToWordWithStats(
  word: Record<string, unknown> & { stats?: unknown }
): WordWithStats {
  return {
    ...word,
    statistics: word.stats as Tables<"word_statistics"> | undefined,
  } as WordWithStats;
}

export interface SelectAdaptiveWordsParams {
  /** Guest mode has no server-side stats, so selection stays entirely client-side. */
  isGuest: boolean;
  /** Authenticated user id; required for the RPC path, ignored for guests. */
  userId: string | null;
  /** The in-memory word pool. Used directly for guests and as the RPC fallback. */
  words: WordWithStats[];
  /** How many words to drill. */
  count: number;
}

/**
 * Selects `count` adaptively-weighted words to drill.
 *
 * Authenticated users get the server-ranked set from `select_test_words`
 * (shuffled so the hardest word isn't always first); if that RPC errors we fall
 * back to the pure client-side selection over whatever pool we were handed, so a
 * transient backend problem degrades gracefully rather than blocking practice.
 */
export async function selectAdaptiveWords({
  isGuest,
  userId,
  words,
  count,
}: SelectAdaptiveWordsParams): Promise<WordWithStats[]> {
  if (isGuest) {
    return selectTestWords(words, count);
  }

  if (!userId) return [];

  const { data, error } = await supabase.rpc("select_test_words", {
    p_user_id: userId,
    p_limit: count,
  });

  if (error) {
    console.error("Error fetching adaptive words:", error);
    // Fall back to the pure client-side selection over the pool we have.
    return selectTestWords(
      words.filter((w) => w !== null),
      count
    );
  }

  const lowConfidenceWords = (
    data as Array<Record<string, unknown> & { stats?: unknown }>
  ).map((word) => mapRpcWordToWordWithStats(word));

  return shuffleArray([...lowConfidenceWords]);
}
