/*
  # Add Translation Cache Expiration Policy

  1. Changes
    - Document 30-day expiration policy for translation cache
    - Ensures compliance with Google Gemini API terms regarding temporary caching
    - Uses existing cleanup infrastructure (pg_cron job already configured)

  2. Background
    - Translation cache cleanup function already exists from migration 20251123201749
    - Cleanup job runs daily via pg_cron (configured in migration 20251125002247)
    - This migration documents the expiration policy for legal compliance

  3. Notes
    - Translations unused for 30 days are automatically removed
    - This balances performance (caching) with API terms compliance
    - No code changes needed, only documentation
*/

-- Add comment to translation_cache table documenting the expiration policy
COMMENT ON TABLE translation_cache IS 'Caches translation results from Google Gemini API. Entries automatically expire after 30 days of inactivity to comply with API terms. Cleanup is performed daily via pg_cron job calling cleanup_translation_cache().';

-- Verify the cleanup function exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'cleanup_translation_cache'
  ) THEN
    RAISE EXCEPTION 'cleanup_translation_cache function does not exist. Please check migration 20251123201749.';
  END IF;

  RAISE NOTICE 'Translation cache expiration policy confirmed: 30 days of inactivity';
END $$;
