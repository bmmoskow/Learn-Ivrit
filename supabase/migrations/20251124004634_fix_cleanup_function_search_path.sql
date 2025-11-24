/*
  # Fix search_path for cleanup function

  ## Security Fix
  - Set explicit search_path on cleanup_word_definitions_cache function
  - This prevents potential security issues with SECURITY DEFINER functions
  
  ## Changes
  - Recreate cleanup_word_definitions_cache with SET search_path = public
*/

CREATE OR REPLACE FUNCTION cleanup_word_definitions_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete definitions matching either cleanup rule:
  -- 1. Not accessed in 90 days with fewer than 3 accesses
  -- 2. Not accessed in 120 days (regardless of access count)
  DELETE FROM word_definitions
  WHERE (last_accessed < now() - interval '90 days' AND access_count < 3)
     OR (last_accessed < now() - interval '120 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;
