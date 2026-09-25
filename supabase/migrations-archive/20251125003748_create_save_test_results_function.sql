/*
  # Create atomic test result saving function

  1. New Functions
    - `save_complete_test_results` - Atomically saves all test data in a single transaction
      - Inserts test summary into `user_tests`
      - Inserts all test responses into `test_responses`
      - Updates all word statistics in `word_statistics`
      - Returns the created test ID

  2. Benefits
    - Single atomic transaction ensures data consistency
    - All tables update together or not at all
    - Single network round-trip improves performance
    - Database-side bulk operations are more efficient

  3. Parameters
    - `p_user_id` - User performing the test
    - `p_test_type` - Type of test (flashcard, multiple_choice, fill_in_blank)
    - `p_total_questions` - Total number of questions in test
    - `p_correct_answers` - Number of correct answers
    - `p_score_percentage` - Score as percentage
    - `p_duration_seconds` - Test duration in seconds
    - `p_responses` - JSONB array of test responses
    - `p_statistics` - JSONB array of word statistics updates
*/

CREATE OR REPLACE FUNCTION save_complete_test_results(
  p_user_id uuid,
  p_test_type text,
  p_total_questions integer,
  p_correct_answers integer,
  p_score_percentage numeric,
  p_duration_seconds integer,
  p_responses jsonb,
  p_statistics jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_id uuid;
BEGIN
  INSERT INTO user_tests (
    user_id,
    test_type,
    total_questions,
    correct_answers,
    score_percentage,
    duration_seconds
  ) VALUES (
    p_user_id,
    p_test_type,
    p_total_questions,
    p_correct_answers,
    p_score_percentage,
    p_duration_seconds
  )
  RETURNING id INTO v_test_id;

  INSERT INTO test_responses (
    test_id,
    user_id,
    word_id,
    user_answer,
    correct_answer,
    is_correct,
    response_time_seconds
  )
  SELECT
    v_test_id,
    p_user_id,
    (r->>'word_id')::uuid,
    r->>'user_answer',
    r->>'correct_answer',
    (r->>'is_correct')::boolean,
    (r->>'response_time_seconds')::integer
  FROM jsonb_array_elements(p_responses) AS r;

  INSERT INTO word_statistics (
    user_id,
    word_id,
    correct_count,
    incorrect_count,
    total_attempts,
    consecutive_correct,
    last_tested,
    confidence_score
  )
  SELECT
    p_user_id,
    (s->>'word_id')::uuid,
    (s->>'correct_count')::integer,
    (s->>'incorrect_count')::integer,
    (s->>'total_attempts')::integer,
    (s->>'consecutive_correct')::integer,
    (s->>'last_tested')::timestamptz,
    (s->>'confidence_score')::numeric
  FROM jsonb_array_elements(p_statistics) AS s
  ON CONFLICT (user_id, word_id) DO UPDATE SET
    correct_count = EXCLUDED.correct_count,
    incorrect_count = EXCLUDED.incorrect_count,
    total_attempts = EXCLUDED.total_attempts,
    consecutive_correct = EXCLUDED.consecutive_correct,
    last_tested = EXCLUDED.last_tested,
    confidence_score = EXCLUDED.confidence_score,
    updated_at = now();

  RETURN v_test_id;
END;
$$;