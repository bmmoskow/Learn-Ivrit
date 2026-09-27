-- Schedule the pg_cron cache-cleanup jobs as tracked schema.
--
-- These 4 jobs run the cleanup_* functions the baseline defines, so caches
-- auto-expire (Gemini terms compliance + cost control). They previously lived
-- in a loose companion file (supabase/cron-jobs.sql), which meant a fresh
-- test/staging rebuild would NOT reproduce them — the drift this baseline effort
-- set out to eliminate. Making them a migration fixes that.
--
-- GUARDED: pg_cron is a managed/optional extension, unavailable on a typical
-- local Docker stack. The availability check makes this a clean no-op there,
-- so `supabase db reset` still works locally. On hosted projects (test/prod)
-- pg_cron is available, so it installs the extension and schedules the jobs.
--
-- IDEMPOTENT: cron.schedule(name, ...) upserts by job name (pg_cron >= 1.4), so
-- re-applying is safe and this is a no-op on both hosted DBs (which already have
-- the jobs). On hosted, any real failure (e.g. a missing cleanup_* function) is
-- allowed to surface and fail the migration — only the "pg_cron absent" case is
-- skipped.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron is not available (expected on local Docker) — skipping cron scheduling.';
    RETURN;
  END IF;

  CREATE EXTENSION IF NOT EXISTS pg_cron;

  PERFORM cron.schedule('cleanup_word_definitions_daily',  '0 3 * * *',  'SELECT cleanup_word_definitions_cache();');
  PERFORM cron.schedule('cleanup_translation_cache_daily', '15 3 * * *', 'SELECT cleanup_translation_cache();');
  PERFORM cron.schedule('cleanup_sefaria_cache_daily',     '30 3 * * *', 'SELECT cleanup_sefaria_cache();');
  PERFORM cron.schedule('cleanup-gemini-rate-limits',      '0 * * * *',  'SELECT cleanup_gemini_api_rate_limits();');
END $$;
