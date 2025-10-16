/*
  # Create word definitions cache table

  1. New Tables
    - `word_definitions`
      - `id` (uuid, primary key)
      - `word` (text, unique) - The Hebrew word without vowels (normalized)
      - `word_with_vowels` (text) - The Hebrew word with full vowel marks
      - `definition` (text) - The English definition
      - `transliteration` (text) - Romanized pronunciation
      - `examples` (jsonb) - Array of example sentences with translations
      - `notes` (text) - Usage notes and common phrases
      - `forms` (jsonb) - Array of related word forms
      - `short_english` (text) - Brief translation for quick display
      - `created_at` (timestamptz) - When the definition was cached
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `word_definitions` table
    - Add policy for authenticated users to read cached definitions
    - Add policy for authenticated users to insert new definitions (for caching)

  3. Indexes
    - Add unique index on `word` for fast lookups
    - Add index on `created_at` for potential cleanup queries
*/

CREATE TABLE IF NOT EXISTS word_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  word_with_vowels text NOT NULL,
  definition text NOT NULL,
  transliteration text NOT NULL DEFAULT '',
  examples jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  forms jsonb DEFAULT '[]'::jsonb,
  short_english text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE word_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read word definitions"
  ON word_definitions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert word definitions"
  ON word_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_word_definitions_word ON word_definitions(word);
CREATE INDEX IF NOT EXISTS idx_word_definitions_created_at ON word_definitions(created_at);