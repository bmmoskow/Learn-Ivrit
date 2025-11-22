/*
  # Add Translation to Sefaria Cache

  1. Changes
    - Add `translation` column to `sefaria_cache` table
      - `translation` (text) - Cached English translation of the Hebrew text
      - This allows us to avoid re-translating the same Bible passages

  2. Notes
    - The translation column is nullable to maintain compatibility with existing cached entries
    - Existing entries without translations will be updated when accessed
    - This significantly reduces API calls to the translation service for popular chapters
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sefaria_cache' AND column_name = 'translation'
  ) THEN
    ALTER TABLE sefaria_cache ADD COLUMN translation text;
  END IF;
END $$;
