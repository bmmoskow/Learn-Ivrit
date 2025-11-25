/*
  # Fix select_test_words Function Search Path
  
  Sets the search_path configuration for the select_test_words function to resolve the security warning.
  
  ## Changes
  
  - Adds `SET search_path = public` to the function configuration
  - This ensures the function only accesses objects in the public schema
  - Prevents any potential search_path manipulation attacks
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
    ) as stats
  FROM vocabulary_words vw
  LEFT JOIN word_statistics ws ON vw.id = ws.word_id AND ws.user_id = vw.user_id
  WHERE vw.user_id = p_user_id
  ORDER BY COALESCE(ws.confidence_score, 0) ASC, RANDOM()
  LIMIT p_limit;
END;
$$;
