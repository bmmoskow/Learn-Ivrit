/*
  # Update translation cache cleanup policy

  1. Changes
    - Modify cleanup_translation_cache() function to delete entries that:
      - Haven't been accessed in 90 days AND have fewer than 3 accesses, OR
      - Haven't been accessed in 120 days (regardless of access count)
    
  2. Reasoning
    - Prevents translations from living forever if accessed 3+ times
    - Ensures old cached data is eventually removed even if frequently used
    - Balances cache efficiency with database storage management
*/

-- Update cleanup function with additional time-based deletion
CREATE OR REPLACE FUNCTION cleanup_translation_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete translations that:
  -- 1. Haven't been accessed in 90 days and have fewer than 3 accesses, OR
  -- 2. Haven't been accessed in 120 days (regardless of access count)
  DELETE FROM translation_cache
  WHERE (last_accessed < now() - interval '90 days' AND access_count < 3)
     OR last_accessed < now() - interval '120 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;