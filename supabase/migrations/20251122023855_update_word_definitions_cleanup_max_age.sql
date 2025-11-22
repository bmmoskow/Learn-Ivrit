/*
  # Update word definitions cache cleanup with max age

  1. Changes
    - Update cleanup function to delete definitions older than 120 days regardless of access count
    - Keep existing logic: delete definitions not accessed in 90 days with fewer than 3 accesses
    - This prevents indefinite accumulation of even frequently accessed definitions

  2. Cleanup Rules
    - Rule 1: Delete if not accessed in 90 days AND fewer than 3 accesses
    - Rule 2: Delete if not accessed in 120 days (regardless of access count)
*/

CREATE OR REPLACE FUNCTION cleanup_word_definitions_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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
