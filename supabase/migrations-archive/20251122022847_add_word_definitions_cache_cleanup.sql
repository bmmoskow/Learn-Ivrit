/*
  # Add cache cleanup for word definitions

  1. Changes
    - Add `last_accessed` column to track when a definition was last used
    - Add `access_count` column to track how frequently a definition is accessed
    - Create cleanup function to remove old, unused definitions
    - Function runs automatically when called and cleans up definitions not accessed in 90 days with less than 3 accesses

  2. New Columns
    - `last_accessed` (timestamptz) - Timestamp of last access, defaults to created_at
    - `access_count` (integer) - Number of times accessed, defaults to 0

  3. Functions
    - `cleanup_word_definitions_cache()` - Removes old, unused cached definitions
      - Deletes definitions not accessed in 90 days
      - Only removes definitions with fewer than 3 accesses
      - Returns count of deleted rows

  4. Notes
    - Cleanup preserves frequently accessed definitions regardless of age
    - Cleanup preserves recently accessed definitions regardless of access count
    - Function should be called by application code during normal operation
*/

-- Add tracking columns
ALTER TABLE word_definitions
ADD COLUMN IF NOT EXISTS last_accessed timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS access_count integer DEFAULT 0;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_word_definitions_last_accessed
ON word_definitions(last_accessed);

CREATE INDEX IF NOT EXISTS idx_word_definitions_access_count
ON word_definitions(access_count);

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_word_definitions_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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
