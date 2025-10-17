/*
  # Add UPDATE policy for word definitions cache

  1. Changes
    - Add policy for authenticated users to update cached word definitions
    - This is needed because the application uses upsert() which requires both INSERT and UPDATE permissions

  2. Security
    - Allows authenticated users to update existing cached definitions
    - This enables the cache to be refreshed when needed
*/

CREATE POLICY IF NOT EXISTS "Authenticated users can update word definitions"
  ON word_definitions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
