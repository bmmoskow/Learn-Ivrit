/*
  # Initial Schema for Hebrew Learning Platform

  ## Overview
  Creates the core database structure for a multi-user Hebrew learning application with vocabulary tracking and adaptive testing.

  ## 1. New Tables
  
  ### `profiles`
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text, nullable) - User's full name
  - `created_at` (timestamptz) - Account creation date
  - `updated_at` (timestamptz) - Last profile update
  
  ### `vocabulary_words`
  - `id` (uuid, primary key) - Unique word entry ID
  - `user_id` (uuid, foreign key) - Owner of this vocabulary entry
  - `hebrew_word` (text) - Hebrew word or phrase
  - `english_translation` (text) - English translation
  - `definition` (text) - Detailed definition
  - `transliteration` (text, nullable) - Pronunciation guide
  - `created_at` (timestamptz) - Date word was added
  - `updated_at` (timestamptz) - Last modification date
  
  ### `word_statistics`
  - `id` (uuid, primary key) - Unique statistics record ID
  - `user_id` (uuid, foreign key) - User who owns this data
  - `word_id` (uuid, foreign key) - References vocabulary_words
  - `correct_count` (integer) - Number of correct answers
  - `incorrect_count` (integer) - Number of incorrect answers
  - `total_attempts` (integer) - Total times tested
  - `consecutive_correct` (integer) - Current streak of correct answers
  - `last_tested` (timestamptz, nullable) - Last time word was tested
  - `confidence_score` (numeric) - Calculated mastery score (0-100)
  - `created_at` (timestamptz) - Record creation date
  - `updated_at` (timestamptz) - Last update date
  
  ### `user_tests`
  - `id` (uuid, primary key) - Unique test session ID
  - `user_id` (uuid, foreign key) - User who took the test
  - `test_type` (text) - Type of test (flashcard, multiple_choice, fill_in_blank)
  - `total_questions` (integer) - Number of questions in test
  - `correct_answers` (integer) - Number of correct answers
  - `score_percentage` (numeric) - Final score as percentage
  - `duration_seconds` (integer, nullable) - Time taken to complete
  - `completed_at` (timestamptz) - Test completion timestamp
  - `created_at` (timestamptz) - Test start timestamp
  
  ### `test_responses`
  - `id` (uuid, primary key) - Unique response ID
  - `test_id` (uuid, foreign key) - References user_tests
  - `user_id` (uuid, foreign key) - User who answered
  - `word_id` (uuid, foreign key) - Word being tested
  - `user_answer` (text) - User's answer
  - `correct_answer` (text) - Correct answer
  - `is_correct` (boolean) - Whether answer was correct
  - `response_time_seconds` (integer, nullable) - Time to answer
  - `created_at` (timestamptz) - Response timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Users can only access their own data
  - All policies check authentication via auth.uid()
  - Separate policies for SELECT, INSERT, UPDATE, DELETE operations

  ## 3. Indexes
  - Index on user_id for all tables for fast user-specific queries
  - Index on word_id in word_statistics for performance
  - Index on test_id in test_responses for efficient lookups

  ## 4. Important Notes
  - All tables include created_at and updated_at timestamps
  - Foreign keys ensure referential integrity
  - Default values prevent null issues (e.g., 0 for counters)
  - Confidence score is calculated field (0-100 range)
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create vocabulary_words table
CREATE TABLE IF NOT EXISTS vocabulary_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hebrew_word text NOT NULL,
  english_translation text NOT NULL,
  definition text NOT NULL,
  transliteration text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vocabulary"
  ON vocabulary_words FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vocabulary"
  ON vocabulary_words FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vocabulary"
  ON vocabulary_words FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vocabulary"
  ON vocabulary_words FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for vocabulary_words
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_user_id ON vocabulary_words(user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_hebrew_word ON vocabulary_words(hebrew_word);

-- Create word_statistics table
CREATE TABLE IF NOT EXISTS word_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES vocabulary_words(id) ON DELETE CASCADE,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  total_attempts integer DEFAULT 0,
  consecutive_correct integer DEFAULT 0,
  last_tested timestamptz,
  confidence_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, word_id)
);

ALTER TABLE word_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own word statistics"
  ON word_statistics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word statistics"
  ON word_statistics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word statistics"
  ON word_statistics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own word statistics"
  ON word_statistics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for word_statistics
CREATE INDEX IF NOT EXISTS idx_word_statistics_user_id ON word_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_word_statistics_word_id ON word_statistics(word_id);
CREATE INDEX IF NOT EXISTS idx_word_statistics_confidence ON word_statistics(confidence_score);

-- Create user_tests table
CREATE TABLE IF NOT EXISTS user_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type text NOT NULL,
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  score_percentage numeric DEFAULT 0,
  duration_seconds integer,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tests"
  ON user_tests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tests"
  ON user_tests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tests"
  ON user_tests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tests"
  ON user_tests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for user_tests
CREATE INDEX IF NOT EXISTS idx_user_tests_user_id ON user_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tests_completed_at ON user_tests(completed_at);

-- Create test_responses table
CREATE TABLE IF NOT EXISTS test_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES user_tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id uuid NOT NULL REFERENCES vocabulary_words(id) ON DELETE CASCADE,
  user_answer text NOT NULL,
  correct_answer text NOT NULL,
  is_correct boolean DEFAULT false,
  response_time_seconds integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test responses"
  ON test_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test responses"
  ON test_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test responses"
  ON test_responses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own test responses"
  ON test_responses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for test_responses
CREATE INDEX IF NOT EXISTS idx_test_responses_test_id ON test_responses(test_id);
CREATE INDEX IF NOT EXISTS idx_test_responses_user_id ON test_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_test_responses_word_id ON test_responses(word_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_words_updated_at
  BEFORE UPDATE ON vocabulary_words
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_word_statistics_updated_at
  BEFORE UPDATE ON word_statistics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();