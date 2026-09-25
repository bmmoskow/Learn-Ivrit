/*
  # Create Adaptive Test Word Selection Function

  Creates a PostgreSQL function that implements the adaptive algorithm for selecting test words.
  This moves the word selection logic from the frontend to the database for better performance.

  ## Algorithm Logic

  The function calculates a weight for each vocabulary word based on:
  
  1. **Untested words** (no statistics): Weight = 100 (highest priority)
  2. **Mastered words** (consecutive_correct >= 5): Weight = 10 (lowest priority)
  3. **Error rate**: Higher error rate increases weight (multiplier: 1 + error_rate * 4)
  4. **Recency**: Words not tested recently get higher weight
     - 7+ days: 1.5x multiplier
     - 3-7 days: 1.2x multiplier
     - < 3 days: 1.0x multiplier
  5. **Confidence penalty**: Lower confidence increases weight
  
  ## Function Signature

  - **p_user_id**: UUID of the user
  - **p_limit**: Maximum number of words to return
  
  ## Returns

  JSON array of vocabulary words with their statistics, ordered by weight (highest first)
*/

CREATE OR REPLACE FUNCTION select_test_words(
  p_user_id uuid,
  p_limit integer
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  hebrew_word text,
  english_translation text,
  definition text,
  transliteration text,
  created_at timestamptz,
  updated_at timestamptz,
  stats jsonb
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH word_weights AS (
    SELECT 
      vw.id,
      vw.user_id,
      vw.hebrew_word,
      vw.english_translation,
      vw.definition,
      vw.transliteration,
      vw.created_at,
      vw.updated_at,
      COALESCE(
        jsonb_build_object(
          'id', ws.id,
          'user_id', ws.user_id,
          'word_id', ws.word_id,
          'correct_count', ws.correct_count,
          'incorrect_count', ws.incorrect_count,
          'total_attempts', ws.total_attempts,
          'consecutive_correct', ws.consecutive_correct,
          'last_tested', ws.last_tested,
          'confidence_score', ws.confidence_score,
          'created_at', ws.created_at,
          'updated_at', ws.updated_at
        ),
        jsonb_build_object(
          'correct_count', 0,
          'incorrect_count', 0,
          'total_attempts', 0,
          'consecutive_correct', 0,
          'last_tested', null,
          'confidence_score', 0
        )
      ) as stats,
      CASE
        WHEN ws.total_attempts IS NULL OR ws.total_attempts = 0 THEN 100.0
        WHEN ws.consecutive_correct >= 5 THEN 10.0
        ELSE (
          100.0 
          * (1 + (ws.incorrect_count::float / NULLIF(ws.total_attempts, 0)) * 4)
          * (
            CASE 
              WHEN ws.last_tested IS NULL THEN 1.0
              WHEN EXTRACT(EPOCH FROM (NOW() - ws.last_tested)) / 86400 > 7 THEN 1.5
              WHEN EXTRACT(EPOCH FROM (NOW() - ws.last_tested)) / 86400 > 3 THEN 1.2
              ELSE 1.0
            END
          )
          * (1 + (100 - COALESCE(ws.confidence_score, 0)) / 100.0)
        )
      END as weight
    FROM vocabulary_words vw
    LEFT JOIN word_statistics ws ON vw.id = ws.word_id AND ws.user_id = vw.user_id
    WHERE vw.user_id = p_user_id
  )
  SELECT 
    ww.id,
    ww.user_id,
    ww.hebrew_word,
    ww.english_translation,
    ww.definition,
    ww.transliteration,
    ww.created_at,
    ww.updated_at,
    ww.stats
  FROM word_weights ww
  ORDER BY ww.weight DESC, RANDOM()
  LIMIT p_limit;
END;
$$;
