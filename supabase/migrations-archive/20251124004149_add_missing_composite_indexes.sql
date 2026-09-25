/*
  # Add Missing Composite Indexes

  This migration adds composite indexes that improve query performance for common access patterns.

  ## New Indexes
  
  ### test_responses table
  - `idx_test_responses_test_user` - Composite index on (test_id, user_id) for filtering test responses by both test and user
  
  ### user_tests table
  - `idx_user_tests_user_completed` - Composite index on (user_id, completed_at) for retrieving user's tests sorted by completion date
  
  ### word_statistics table
  - `idx_word_statistics_user_confidence` - Composite index on (user_id, confidence_score) for finding words by confidence level per user
  - `idx_word_statistics_user_word` - Composite index on (user_id, word_id) for quick lookups of statistics for a specific word and user
  
  ## Performance Benefits
  - Faster queries when filtering by multiple columns
  - Better support for sorting and range queries
  - Optimized JOIN operations
*/

-- Add composite index for test responses (test_id, user_id)
CREATE INDEX IF NOT EXISTS idx_test_responses_test_user 
ON test_responses (test_id, user_id);

-- Add composite index for user tests (user_id, completed_at)
CREATE INDEX IF NOT EXISTS idx_user_tests_user_completed 
ON user_tests (user_id, completed_at);

-- Add composite index for word statistics (user_id, confidence_score)
CREATE INDEX IF NOT EXISTS idx_word_statistics_user_confidence 
ON word_statistics (user_id, confidence_score);

-- Add composite index for word statistics (user_id, word_id)
CREATE INDEX IF NOT EXISTS idx_word_statistics_user_word 
ON word_statistics (user_id, word_id);
