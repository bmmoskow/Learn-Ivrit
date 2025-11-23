/*
  # Create translation cache with hash-based storage

  1. New Tables
    - `translation_cache`
      - `id` (uuid, primary key) - Unique identifier
      - `content_hash` (text, unique) - SHA-256 hash of Hebrew text content
      - `hebrew_text` (text) - Original Hebrew text (for debugging/verification)
      - `translation` (text) - Translated text
      - `text_length` (integer) - Length of Hebrew text (additional safety)
      - `cached_at` (timestamptz) - When the translation was cached
      - `last_accessed` (timestamptz) - When the translation was last retrieved
      - `access_count` (integer) - Number of times this translation was used

  2. Security
    - Enable RLS on `translation_cache` table
    - Allow authenticated users to read cached translations
    - Allow authenticated users to insert new translations
    - Allow authenticated users to update access tracking

  3. Indexes
    - Primary index on `content_hash` for fast lookups
    - Index on `last_accessed` for efficient cleanup queries
    - Index on `access_count` for cleanup filtering

  4. Cleanup Function
    - `cleanup_translation_cache()` - Removes old, unused translations
    - Deletes translations not accessed in 90 days with fewer than 3 accesses
    - Preserves frequently used or recently accessed translations

  5. Notes
    - Uses SHA-256 hash for content-addressed caching
    - Works for any Hebrew text (URLs, custom input, etc.)
    - Does NOT cache Bible chapters (handled by sefaria_cache)
    - Hash collisions are astronomically unlikely but handled by UNIQUE constraint
*/

-- Create translation cache table
CREATE TABLE IF NOT EXISTS translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text UNIQUE NOT NULL,
  hebrew_text text NOT NULL,
  translation text NOT NULL,
  text_length integer NOT NULL,
  cached_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  access_count integer DEFAULT 0
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_translation_cache_hash ON translation_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_translation_cache_last_accessed ON translation_cache(last_accessed);
CREATE INDEX IF NOT EXISTS idx_translation_cache_access_count ON translation_cache(access_count);

-- Enable RLS
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read cached translations
CREATE POLICY "Authenticated users can read translation cache"
  ON translation_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert new translations
CREATE POLICY "Authenticated users can insert translation cache"
  ON translation_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update access tracking
CREATE POLICY "Authenticated users can update translation cache"
  ON translation_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_translation_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete translations that haven't been accessed in 90 days and have fewer than 3 accesses
  DELETE FROM translation_cache
  WHERE last_accessed < now() - interval '90 days'
    AND access_count < 3;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;