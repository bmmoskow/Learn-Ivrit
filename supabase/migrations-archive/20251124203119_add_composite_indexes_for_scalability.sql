/*
  # Add Composite Indexes for Query Performance

  This migration adds composite indexes to optimize common query patterns
  and improve scalability as the dataset grows.

  ## New Indexes

  ### vocabulary_words
  - `idx_vocabulary_words_user_created` - Composite index on (user_id, created_at DESC)
    - Optimizes the common pattern: load user's vocabulary sorted by creation date
    - Used in VocabularyList component when sortBy='date'

  ### word_statistics  
  - `idx_word_statistics_user_last_tested` - Composite index on (user_id, last_tested)
    - Optimizes queries for adaptive learning algorithm
    - Helps select words that haven't been tested recently
  
  ### word_definitions
  - `idx_word_definitions_word_accessed` - Composite index on (word, last_accessed)
    - Optimizes cache lookups with timestamp checks
    - Used for cache hit/miss determination

  ## Performance Impact
  - Reduces query planning time
  - Eliminates need for multiple index scans
  - Improves performance of sorted, filtered queries at scale
*/

-- Composite index for vocabulary_words: user_id + created_at (for date sorting)
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_user_created 
  ON vocabulary_words(user_id, created_at DESC);

-- Composite index for word_statistics: user_id + last_tested (for adaptive algorithm)
CREATE INDEX IF NOT EXISTS idx_word_statistics_user_last_tested 
  ON word_statistics(user_id, last_tested);

-- Composite index for word_definitions: word + last_accessed (for cache optimization)
CREATE INDEX IF NOT EXISTS idx_word_definitions_word_accessed 
  ON word_definitions(word, last_accessed);
