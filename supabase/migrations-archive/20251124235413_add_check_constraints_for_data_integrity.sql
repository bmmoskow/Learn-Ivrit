/*
  # Add Check Constraints for Data Integrity

  1. Changes
    - Add check constraint for `confidence_score` to ensure it's between 0 and 100
    - Add check constraint for `correct_count` to ensure it's non-negative (>= 0)
    - Add check constraint for `incorrect_count` to ensure it's non-negative (>= 0)
    - Add check constraint for `total_attempts` to ensure it's non-negative (>= 0)
    - Add check constraint for `consecutive_correct` to ensure it's non-negative (>= 0)

  2. Security
    - These constraints ensure data integrity at the database level
    - Prevents invalid data from being inserted or updated
*/

-- Add check constraint for confidence_score (0-100 range)
ALTER TABLE word_statistics
ADD CONSTRAINT check_confidence_score_range 
CHECK (confidence_score >= 0 AND confidence_score <= 100);

-- Add check constraint for correct_count (non-negative)
ALTER TABLE word_statistics
ADD CONSTRAINT check_correct_count_non_negative 
CHECK (correct_count >= 0);

-- Add check constraint for incorrect_count (non-negative)
ALTER TABLE word_statistics
ADD CONSTRAINT check_incorrect_count_non_negative 
CHECK (incorrect_count >= 0);

-- Add check constraint for total_attempts (non-negative)
ALTER TABLE word_statistics
ADD CONSTRAINT check_total_attempts_non_negative 
CHECK (total_attempts >= 0);

-- Add check constraint for consecutive_correct (non-negative)
ALTER TABLE word_statistics
ADD CONSTRAINT check_consecutive_correct_non_negative 
CHECK (consecutive_correct >= 0);
