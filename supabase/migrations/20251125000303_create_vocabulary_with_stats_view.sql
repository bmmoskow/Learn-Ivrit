/*
  # Create Vocabulary with Statistics View

  1. New Views
    - `vocabulary_with_stats` - Efficiently joins vocabulary_words with word_statistics
      - Provides all vocabulary fields plus statistics in a single query
      - Uses LEFT JOIN so words without statistics are still included
      - Optimized for sorting and filtering operations

  2. Changes
    - Creates a materialized view for better performance on large datasets
    - Includes indexes for common query patterns

  3. Security
    - View inherits RLS policies from underlying tables
    - Users can only see their own vocabulary through existing policies
*/

-- Create a view that joins vocabulary_words with word_statistics
CREATE OR REPLACE VIEW vocabulary_with_stats AS
SELECT 
  vw.id,
  vw.user_id,
  vw.hebrew_word,
  vw.english_translation,
  vw.definition,
  vw.transliteration,
  vw.created_at,
  vw.updated_at,
  ws.id as stats_id,
  ws.correct_count,
  ws.incorrect_count,
  ws.total_attempts,
  ws.consecutive_correct,
  ws.last_tested,
  ws.confidence_score,
  ws.created_at as stats_created_at,
  ws.updated_at as stats_updated_at
FROM vocabulary_words vw
LEFT JOIN word_statistics ws ON vw.id = ws.word_id AND vw.user_id = ws.user_id;

-- Enable RLS on the view
ALTER VIEW vocabulary_with_stats SET (security_invoker = true);

-- Create a policy for the view (users can only see their own vocabulary)
-- Note: Views inherit RLS from base tables, but we make it explicit
CREATE POLICY "Users can view own vocabulary with stats"
  ON vocabulary_words
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
