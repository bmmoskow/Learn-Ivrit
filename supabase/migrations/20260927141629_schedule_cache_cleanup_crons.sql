-- Schedule the pg_cron cache-cleanup jobs as tracked schema.
--
-- These 4 jobs run the cleanup_* functions the baseline defines, so caches
-- auto-expire (Gemini terms compliance + cost control). They previously lived
-- in a loose companion file (supabase/cron-jobs.sql), which meant a fresh
-- test/staging rebuild would NOT reproduce them — the drift this baseline effort
-- set out to eliminate. Making them a migration fixes that.
--
-- GUARDED on install: pg_cron is a managed/optional extension, unavailable on a
-- typical local Docker stack — there this is a clean no-op, so `supabase db
-- reset` still works locally. On a hosted project that doesn't yet have it, the
-- extension is installed once.
--
-- IMPORTANT — do NOT run `CREATE EXTENSION` when pg_cron is ALREADY installed.
-- On a hosted DB that already manages pg_cron, re-declaring the extension trips
-- "dependent privileges exist" (SQLSTATE 2BP01) under the db-push connection's
-- role. So the extension is only created when genuinely absent.
--
-- IDEMPOTENT: each job is scheduled only if it doesn't already exist, so this is
-- a true no-op on both hosted DBs (which already have all four) and touches
-- nothing there. A genuinely fresh hosted rebuild gets all four scheduled.

DO $$
BEGIN
  -- Install pg_cron only if it isn't already present.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
      RAISE NOTICE 'pg_cron is not available (expected on local Docker) — skipping cron scheduling.';
      RETURN;
    END IF;
    CREATE EXTENSION pg_cron;
  END IF;

  -- Schedule each job only if missing (avoids touching an already-configured DB).
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_word_definitions_daily') THEN
    PERFORM cron.schedule('cleanup_word_definitions_daily',  '0 3 * * *',  'SELECT cleanup_word_definitions_cache();');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_translation_cache_daily') THEN
    PERFORM cron.schedule('cleanup_translation_cache_daily', '15 3 * * *', 'SELECT cleanup_translation_cache();');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_sefaria_cache_daily') THEN
    PERFORM cron.schedule('cleanup_sefaria_cache_daily',     '30 3 * * *', 'SELECT cleanup_sefaria_cache();');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-gemini-rate-limits') THEN
    PERFORM cron.schedule('cleanup-gemini-rate-limits',      '0 * * * *',  'SELECT cleanup_gemini_api_rate_limits();');
  END IF;
END $$;
