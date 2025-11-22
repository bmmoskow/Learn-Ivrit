/*
  # Create Sefaria Cache Table

  1. New Tables
    - `sefaria_cache`
      - `id` (uuid, primary key) - Unique identifier
      - `reference` (text, unique, not null) - Normalized reference (e.g., "Genesis.1", "Psalms.23")
      - `content` (jsonb, not null) - Full Sefaria API response
      - `cached_at` (timestamptz) - When entry was first cached
      - `last_accessed` (timestamptz) - Last time entry was accessed
      - `access_count` (int) - Number of times accessed
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on `sefaria_cache` table
    - Allow all authenticated users to read cached content
    - Only service role (edge functions) can insert/update cache entries

  3. Indexes
    - Unique index on `reference` for fast lookups
    - Index on `cached_at` for cleanup operations
    - Index on `last_accessed` for identifying stale entries

  4. Notes
    - This cache will store Bible chapter responses from Sefaria API
    - Dramatically reduces API calls for popular chapters
    - Access tracking helps identify which content is most valuable
*/

CREATE TABLE IF NOT EXISTS sefaria_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text UNIQUE NOT NULL,
  content jsonb NOT NULL,
  cached_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  access_count int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sefaria_reference ON sefaria_cache(reference);
CREATE INDEX IF NOT EXISTS idx_sefaria_cached_at ON sefaria_cache(cached_at);
CREATE INDEX IF NOT EXISTS idx_sefaria_last_accessed ON sefaria_cache(last_accessed);

ALTER TABLE sefaria_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached Sefaria content"
  ON sefaria_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert cache entries"
  ON sefaria_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update cache entries"
  ON sefaria_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);