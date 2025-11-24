/*
  # Fix search_path for cleanup_translation_cache function

  ## Security Fix
  - Set explicit search_path on cleanup_translation_cache function
  - This prevents potential security issues with SECURITY DEFINER functions
  - Addresses Supabase security warning about mutable search_path
  
  ## Changes
  - Recreate cleanup_translation_cache with SET search_path = public
*/

CREATE OR REPLACE FUNCTION cleanup_translation_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
