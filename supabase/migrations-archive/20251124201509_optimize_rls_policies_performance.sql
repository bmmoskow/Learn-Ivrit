/*
  # Optimize RLS Policies for Performance

  This migration optimizes all RLS policies that use `auth.uid()` by wrapping it in a subquery.
  This prevents the function from being re-evaluated for each row, significantly improving query performance.

  ## Tables Updated
  - profiles
  - test_responses  
  - user_tests
  - vocabulary_words
  - word_statistics

  ## Changes
  All policies that use `auth.uid()` are updated to use `(select auth.uid())` instead.
  This tells PostgreSQL to evaluate the function once and reuse the result rather than
  re-evaluating it for every row.

  ## Performance Impact
  This optimization is critical for queries at scale, preventing N function calls for N rows.
*/

-- Drop and recreate profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Drop and recreate test_responses policies
DROP POLICY IF EXISTS "Users can view own test responses" ON test_responses;
DROP POLICY IF EXISTS "Users can insert own test responses" ON test_responses;
DROP POLICY IF EXISTS "Users can update own test responses" ON test_responses;
DROP POLICY IF EXISTS "Users can delete own test responses" ON test_responses;

CREATE POLICY "Users can view own test responses"
  ON test_responses FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own test responses"
  ON test_responses FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own test responses"
  ON test_responses FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own test responses"
  ON test_responses FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate user_tests policies
DROP POLICY IF EXISTS "Users can view own tests" ON user_tests;
DROP POLICY IF EXISTS "Users can insert own tests" ON user_tests;
DROP POLICY IF EXISTS "Users can update own tests" ON user_tests;
DROP POLICY IF EXISTS "Users can delete own tests" ON user_tests;

CREATE POLICY "Users can view own tests"
  ON user_tests FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own tests"
  ON user_tests FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own tests"
  ON user_tests FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own tests"
  ON user_tests FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate vocabulary_words policies
DROP POLICY IF EXISTS "Users can view own vocabulary" ON vocabulary_words;
DROP POLICY IF EXISTS "Users can insert own vocabulary" ON vocabulary_words;
DROP POLICY IF EXISTS "Users can update own vocabulary" ON vocabulary_words;
DROP POLICY IF EXISTS "Users can delete own vocabulary" ON vocabulary_words;

CREATE POLICY "Users can view own vocabulary"
  ON vocabulary_words FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own vocabulary"
  ON vocabulary_words FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own vocabulary"
  ON vocabulary_words FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own vocabulary"
  ON vocabulary_words FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate word_statistics policies
DROP POLICY IF EXISTS "Users can view own word statistics" ON word_statistics;
DROP POLICY IF EXISTS "Users can insert own word statistics" ON word_statistics;
DROP POLICY IF EXISTS "Users can update own word statistics" ON word_statistics;
DROP POLICY IF EXISTS "Users can delete own word statistics" ON word_statistics;

CREATE POLICY "Users can view own word statistics"
  ON word_statistics FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own word statistics"
  ON word_statistics FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own word statistics"
  ON word_statistics FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own word statistics"
  ON word_statistics FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);
