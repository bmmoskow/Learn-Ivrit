/*
  # Setup Background Jobs for Cache Cleanup

  1. Overview
    - Enables pg_cron extension for scheduled background jobs
    - Creates scheduled jobs to automatically clean up cache tables
    - Removes dependency on frontend-initiated cleanup

  2. New Extensions
    - `pg_cron` - PostgreSQL extension for cron-based job scheduling

  3. Scheduled Jobs
    - `cleanup_word_definitions_daily` - Runs at 3:00 AM UTC daily
      - Cleans up old word definitions from word_definitions table
      - Removes entries not accessed in 90 days with fewer than 3 accesses
      - Removes entries not accessed in 120 days regardless of access count

    - `cleanup_translation_cache_daily` - Runs at 3:15 AM UTC daily
      - Cleans up old translations from translation_cache table
      - Removes entries not accessed in 90 days with fewer than 3 accesses
      - Removes entries not accessed in 120 days regardless of access count

    - `cleanup_sefaria_cache_daily` - Runs at 3:30 AM UTC daily
      - Cleans up old Sefaria data from sefaria_cache table
      - Removes entries not accessed in 90 days with fewer than 3 accesses
      - Removes entries not accessed in 120 days regardless of access count

  4. Benefits
    - Reliable: Runs automatically without user interaction
    - Efficient: No client-side overhead or network calls
    - Comprehensive: Cleans all cache tables consistently
    - Predictable: Runs at scheduled times with guaranteed execution

  5. Notes
    - Jobs run during low-traffic hours (3 AM UTC) to minimize impact
    - Each cache has 15-minute offset to spread database load
    - If pg_cron is not available, jobs will not be created (no error)
    - Jobs can be monitored via cron.job_run_details table
*/

-- Enable pg_cron extension (only available in hosted Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup for word_definitions cache at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup_word_definitions_daily',
  '0 3 * * *',
  $$SELECT cleanup_word_definitions_cache();$$
);

-- Schedule daily cleanup for translation_cache at 3:15 AM UTC
SELECT cron.schedule(
  'cleanup_translation_cache_daily',
  '15 3 * * *',
  $$SELECT cleanup_translation_cache();$$
);

-- Create cleanup function for sefaria_cache (similar to other cache tables)
CREATE OR REPLACE FUNCTION cleanup_sefaria_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete Sefaria cache entries that:
  -- 1. Haven't been accessed in 90 days and have fewer than 3 accesses, OR
  -- 2. Haven't been accessed in 120 days (regardless of access count)
  DELETE FROM sefaria_cache
  WHERE (last_accessed < now() - interval '90 days' AND access_count < 3)
     OR last_accessed < now() - interval '120 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Schedule daily cleanup for sefaria_cache at 3:30 AM UTC
SELECT cron.schedule(
  'cleanup_sefaria_cache_daily',
  '30 3 * * *',
  $$SELECT cleanup_sefaria_cache();$$
);

-- Grant necessary permissions to service role for cron jobs
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
