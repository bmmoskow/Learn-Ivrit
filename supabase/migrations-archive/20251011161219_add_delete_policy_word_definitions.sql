/*
  # Add delete policy for word definitions cache

  1. Security
    - Add policy for authenticated users to delete word definitions
    - This allows users to clear cached definitions they don't like
*/

CREATE POLICY "Authenticated users can delete word definitions"
  ON word_definitions
  FOR DELETE
  TO authenticated
  USING (true);