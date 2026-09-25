-- =====================================================================
-- Operational companion to the schema baseline: pg_cron cache-cleanup jobs
-- (mirror of production). These schedule the cleanup_* functions that the
-- baseline defines, so caches auto-expire (Gemini terms compliance + cost
-- control). Kept separate from the schema baseline because scheduling is
-- operational, not schema, and pg_cron is a managed/optional extension.
--
-- WHEN TO APPLY: after the baseline, on a HOSTED Supabase project (prod
-- already has these; a fresh test/staging rebuild needs them).
-- NOT for local Docker — pg_cron is typically unavailable there; skip it.
--
-- Prerequisite: pg_cron enabled (Dashboard -> Database -> Extensions, or the
-- CREATE EXTENSION below). cron.schedule(name, ...) upserts by job name
-- (pg_cron >= 1.4), so this is safe to re-run.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('cleanup_word_definitions_daily',  '0 3 * * *',  'SELECT cleanup_word_definitions_cache();');
SELECT cron.schedule('cleanup_translation_cache_daily', '15 3 * * *', 'SELECT cleanup_translation_cache();');
SELECT cron.schedule('cleanup_sefaria_cache_daily',     '30 3 * * *', 'SELECT cleanup_sefaria_cache();');
SELECT cron.schedule('cleanup-gemini-rate-limits',      '0 * * * *',  'SELECT cleanup_gemini_api_rate_limits();');
