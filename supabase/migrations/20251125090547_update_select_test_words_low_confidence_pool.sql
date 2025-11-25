/*
  # Update Test Word Selection to Use Low-Confidence Pool Strategy
  
  This migration replaces the weighted selection algorithm with a simpler, more effective approach:
  
  ## New Strategy
  
  1. **Fetch 4×N words with lowest confidence scores**
     - Includes untested words (confidence_score = 0)
     - Prioritizes words the user struggles with
  
  2. **Simple ordering**: confidence_score ASC (lowest first)
  
  3. **Usage Pattern**:
     - Frontend shuffles and selects N words for test questions
     - Remaining 3×N words serve as distractor pool
     - Test words can also appear as distractors for other questions
  
  ## Benefits
  
  - Focuses learning on weak areas
  - Maximizes exposure to difficult words (as both questions and distractors)
  - Simpler, more predictable behavior
  - Better pedagogical outcomes
  
  ## Function Signature
  
  - **p_user_id**: UUID of the user
  - **p_limit**: Number of words to return (should be 4× question count)
  
  ## Returns
  
  JSON array of vocabulary words with statistics, ordered by confidence_score ASC
*/

DROP FUNCTION IF EXISTS select_test_words(uuid, integer);

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