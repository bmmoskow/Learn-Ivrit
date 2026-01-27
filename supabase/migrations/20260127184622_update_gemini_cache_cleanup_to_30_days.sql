/*
  # Update Gemini API Cache Cleanup to 30-Day Retention

  1. Background
    - Previous migration (20260127071859) documented a 30-day policy but didn't update the code
    - Google Gemini API terms require that cached responses be temporary
    - Only Gemini API caches need the 30-day policy

  2. Changes
    - Update cleanup_translation_cache() to use 30-day retention (was 90/120 days)
    - Update cleanup_word_definitions_cache() to use 30-day retention (was 90/120 days)
    - Leave cleanup_sefaria_cache() unchanged (uses Sefaria API, not Gemini)

  3. New Cleanup Rules
    For translation_cache and word_definitions (Gemini API caches):
    - Delete entries not accessed in 30 days

    For sefaria_cache (Sefaria API cache):
    - Unchanged: 90/120 day policy remains

  4. Notes
    - This ensures compliance with Google Gemini API terms
    - Balances performance with legal requirements
    - Maintains longer retention for non-Gemini data sources
*/

-- Update translation_cache cleanup to 30 days
CREATE OR REPLACE FUNCTION cleanup_translation_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete translations not accessed in 30 days
  -- (Gemini API terms require temporary caching)
  DELETE FROM translation_cache
  WHERE last_accessed < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Update word_definitions_cache cleanup to 30 days
CREATE OR REPLACE FUNCTION cleanup_word_definitions_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete word definitions not accessed in 30 days
  -- (Gemini API terms require temporary caching)
  DELETE FROM word_definitions
  WHERE last_accessed < now() - interval '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Update table comments to reflect the 30-day policy
COMMENT ON TABLE word_definitions IS 'Caches word definitions from Google Gemini API. Entries automatically expire after 30 days of inactivity to comply with API terms. Cleanup is performed daily via pg_cron job calling cleanup_word_definitions_cache().';

-- Verify both functions exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'cleanup_translation_cache'
  ) THEN
    RAISE EXCEPTION 'cleanup_translation_cache function does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'cleanup_word_definitions_cache'
  ) THEN
    RAISE EXCEPTION 'cleanup_word_definitions_cache function does not exist';
  END IF;

  RAISE NOTICE 'Gemini API cache cleanup policies updated: 30 days for translation_cache and word_definitions';
  RAISE NOTICE 'Sefaria cache cleanup policy unchanged: 90/120 days for sefaria_cache';
END $$;
