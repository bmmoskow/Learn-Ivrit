/*
  # Create Function to Increment Translation Cache Access
  
  Creates a helper function to atomically increment the access_count and update last_accessed
  timestamp for cached translations.
  
  ## Changes
  
  - Creates `increment_translation_access(cache_id uuid)` function
  - Updates `access_count` and `last_accessed` in a single atomic operation
  - Set search_path for security
  
  ## Usage
  
  Called when a cached translation is retrieved to track usage statistics.
*/

CREATE OR REPLACE FUNCTION increment_translation_access(cache_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE translation_cache
  SET 
    access_count = access_count + 1,
    last_accessed = now()
  WHERE id = cache_id;
END;
$$;
