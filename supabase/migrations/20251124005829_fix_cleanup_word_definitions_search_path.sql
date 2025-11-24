/*
  # Fix search_path for cleanup_word_definitions_cache function

  ## Security Fix
  - Set explicit search_path on cleanup_word_definitions_cache function
  - This prevents potential security issues with SECURITY DEFINER functions
  - Addresses Supabase security warning about mutable search_path
  
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
  -- Delete definitions that haven't been accessed in 90 days and have fewer than 3 accesses
  DELETE FROM word_definitions
  WHERE last_accessed < now() - interval '90 days'
    AND access_count < 3;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;
