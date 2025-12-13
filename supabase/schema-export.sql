--
-- Complete Database Schema Export
-- Generated from live Supabase database
-- Date: 2025-12-13
--

-- =============================================
-- TABLES
-- =============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Vocabulary words table
CREATE TABLE IF NOT EXISTS vocabulary_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  hebrew_word text NOT NULL,
  english_translation text NOT NULL,
  definition text NOT NULL,
  transliteration text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT vocabulary_words_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Word statistics table
CREATE TABLE IF NOT EXISTS word_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word_id uuid NOT NULL,
  correct_count integer DEFAULT 0 CHECK (correct_count >= 0),
  incorrect_count integer DEFAULT 0 CHECK (incorrect_count >= 0),
  total_attempts integer DEFAULT 0 CHECK (total_attempts >= 0),
  consecutive_correct integer DEFAULT 0 CHECK (consecutive_correct >= 0),
  last_tested timestamptz,
  confidence_score numeric DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT word_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT word_statistics_word_id_fkey FOREIGN KEY (word_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE,
  UNIQUE (user_id, word_id)
);

-- User tests table
CREATE TABLE IF NOT EXISTS user_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  test_type text NOT NULL,
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  score_percentage numeric DEFAULT 0,
  duration_seconds integer,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT user_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Test responses table
CREATE TABLE IF NOT EXISTS test_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL,
  user_id uuid NOT NULL,
  word_id uuid NOT NULL,
  user_answer text NOT NULL,
  correct_answer text NOT NULL,
  is_correct boolean DEFAULT false,
  response_time_seconds integer,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT test_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT test_responses_test_id_fkey FOREIGN KEY (test_id) REFERENCES user_tests(id) ON DELETE CASCADE,
  CONSTRAINT test_responses_word_id_fkey FOREIGN KEY (word_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE
);

-- Word definitions cache table
CREATE TABLE IF NOT EXISTS word_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  word_with_vowels text NOT NULL,
  definition text NOT NULL,
  transliteration text NOT NULL DEFAULT '',
  examples jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT '',
  forms jsonb DEFAULT '[]'::jsonb,
  short_english text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  access_count integer DEFAULT 0
);

-- Sefaria cache table
CREATE TABLE IF NOT EXISTS sefaria_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  content jsonb NOT NULL,
  translation text,
  cached_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  access_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Translation cache table
CREATE TABLE IF NOT EXISTS translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_hash text NOT NULL UNIQUE,
  hebrew_text text NOT NULL,
  translation text NOT NULL,
  text_length integer NOT NULL,
  cached_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  access_count integer DEFAULT 0
);

-- URL extraction cache table
CREATE TABLE IF NOT EXISTS url_extraction_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  extracted_text text NOT NULL,
  cached_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  access_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Gemini API rate limits table
CREATE TABLE IF NOT EXISTS gemini_api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('word_definition', 'passage_translation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gemini_api_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- User word definitions table
CREATE TABLE IF NOT EXISTS user_word_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  word text NOT NULL CHECK (length(TRIM(word)) > 0),
  definition text NOT NULL CHECK (length(TRIM(definition)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_word_definitions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  UNIQUE (user_id, word)
);

-- Bookmark folders table
CREATE TABLE IF NOT EXISTS bookmark_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (length(TRIM(name)) > 0),
  parent_folder_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bookmark_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT bookmark_folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES bookmark_folders(id) ON DELETE CASCADE,
  UNIQUE (user_id, parent_folder_id, name)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  folder_id uuid,
  name text NOT NULL CHECK (length(TRIM(name)) > 0),
  hebrew_text text NOT NULL CHECK (length(TRIM(hebrew_text)) > 0),
  source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT bookmarks_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES bookmark_folders(id) ON DELETE CASCADE,
  UNIQUE (user_id, folder_id, name)
);

-- =============================================
-- INDEXES
-- =============================================

-- Bookmark folders indexes
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user_id ON bookmark_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_parent_folder_id ON bookmark_folders(parent_folder_id);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder_id ON bookmarks(folder_id);

-- Gemini API rate limits indexes
CREATE INDEX IF NOT EXISTS idx_gemini_rate_limits_user_type_time ON gemini_api_rate_limits(user_id, request_type, created_at DESC);

-- Sefaria cache indexes
CREATE INDEX IF NOT EXISTS idx_sefaria_reference ON sefaria_cache(reference);
CREATE INDEX IF NOT EXISTS idx_sefaria_cached_at ON sefaria_cache(cached_at);
CREATE INDEX IF NOT EXISTS idx_sefaria_last_accessed ON sefaria_cache(last_accessed);

-- Test responses indexes
CREATE INDEX IF NOT EXISTS idx_test_responses_user_id ON test_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_test_responses_test_id ON test_responses(test_id);
CREATE INDEX IF NOT EXISTS idx_test_responses_word_id ON test_responses(word_id);
CREATE INDEX IF NOT EXISTS idx_test_responses_test_user ON test_responses(test_id, user_id);

-- Translation cache indexes
CREATE INDEX IF NOT EXISTS idx_translation_cache_hash ON translation_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_translation_cache_last_accessed ON translation_cache(last_accessed);
CREATE INDEX IF NOT EXISTS idx_translation_cache_access_count ON translation_cache(access_count);

-- URL extraction cache indexes
CREATE INDEX IF NOT EXISTS idx_url_extraction_url ON url_extraction_cache(url);

-- User tests indexes
CREATE INDEX IF NOT EXISTS idx_user_tests_user_id ON user_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tests_completed_at ON user_tests(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_tests_user_completed ON user_tests(user_id, completed_at);

-- User word definitions indexes
CREATE INDEX IF NOT EXISTS idx_user_word_definitions_user_word ON user_word_definitions(user_id, word);

-- Vocabulary words indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_user_id ON vocabulary_words(user_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_hebrew_word ON vocabulary_words(hebrew_word);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_user_created ON vocabulary_words(user_id, created_at DESC);

-- Word definitions indexes
CREATE INDEX IF NOT EXISTS idx_word_definitions_word ON word_definitions(word);
CREATE INDEX IF NOT EXISTS idx_word_definitions_last_accessed ON word_definitions(last_accessed);
CREATE INDEX IF NOT EXISTS idx_word_definitions_access_count ON word_definitions(access_count);
CREATE INDEX IF NOT EXISTS idx_word_definitions_created_at ON word_definitions(created_at);
CREATE INDEX IF NOT EXISTS idx_word_definitions_word_accessed ON word_definitions(word, last_accessed);

-- Word statistics indexes
CREATE INDEX IF NOT EXISTS idx_word_statistics_user_id ON word_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_word_statistics_word_id ON word_statistics(word_id);
CREATE INDEX IF NOT EXISTS idx_word_statistics_user_word ON word_statistics(user_id, word_id);
CREATE INDEX IF NOT EXISTS idx_word_statistics_confidence ON word_statistics(confidence_score);
CREATE INDEX IF NOT EXISTS idx_word_statistics_user_confidence ON word_statistics(user_id, confidence_score);
CREATE INDEX IF NOT EXISTS idx_word_statistics_user_last_tested ON word_statistics(user_id, last_tested);

-- =============================================
-- VIEWS
-- =============================================

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
  ws.id AS stats_id,
  ws.correct_count,
  ws.incorrect_count,
  ws.total_attempts,
  ws.consecutive_correct,
  ws.last_tested,
  ws.confidence_score,
  ws.created_at AS stats_created_at,
  ws.updated_at AS stats_updated_at
FROM vocabulary_words vw
LEFT JOIN word_statistics ws ON vw.id = ws.word_id AND vw.user_id = ws.user_id;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Update updated_at column trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update user word definitions updated_at trigger function
CREATE OR REPLACE FUNCTION update_user_word_definitions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Cleanup word definitions cache function
CREATE OR REPLACE FUNCTION cleanup_word_definitions_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM word_definitions
  WHERE last_accessed < now() - interval '90 days'
    AND access_count < 3;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Cleanup Sefaria cache function
CREATE OR REPLACE FUNCTION cleanup_sefaria_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM sefaria_cache
  WHERE (last_accessed < now() - interval '90 days' AND access_count < 3)
     OR last_accessed < now() - interval '120 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Cleanup translation cache function
CREATE OR REPLACE FUNCTION cleanup_translation_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM translation_cache
  WHERE (last_accessed < now() - interval '90 days' AND access_count < 3)
     OR last_accessed < now() - interval '120 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Cleanup Gemini API rate limits function
CREATE OR REPLACE FUNCTION cleanup_gemini_api_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.gemini_api_rate_limits
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Increment translation access function
CREATE OR REPLACE FUNCTION increment_translation_access(cache_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE translation_cache
  SET
    access_count = access_count + 1,
    last_accessed = now()
  WHERE id = cache_id;
END;
$$;

-- Select test words function
CREATE OR REPLACE FUNCTION select_test_words(p_user_id uuid, p_limit integer)
RETURNS TABLE(
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
SET search_path TO 'public'
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

-- Save complete test results function
CREATE OR REPLACE FUNCTION save_complete_test_results(
  p_user_id uuid,
  p_test_type text,
  p_total_questions integer,
  p_correct_answers integer,
  p_score_percentage numeric,
  p_duration_seconds integer,
  p_responses jsonb,
  p_statistics jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- =============================================
-- TRIGGERS
-- =============================================

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

CREATE TRIGGER update_bookmark_folders_updated_at
  BEFORE UPDATE ON bookmark_folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gemini_api_rate_limits_updated_at
  BEFORE UPDATE ON gemini_api_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_word_definitions_updated_at
  BEFORE UPDATE ON user_word_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_word_definitions_updated_at();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sefaria_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_extraction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE gemini_api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_word_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Vocabulary words policies
CREATE POLICY "Users can view own vocabulary" ON vocabulary_words FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vocabulary" ON vocabulary_words FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vocabulary" ON vocabulary_words FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own vocabulary" ON vocabulary_words FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Word statistics policies
CREATE POLICY "Users can view own word statistics" ON word_statistics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own word statistics" ON word_statistics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own word statistics" ON word_statistics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own word statistics" ON word_statistics FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- User tests policies
CREATE POLICY "Users can view own tests" ON user_tests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tests" ON user_tests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tests" ON user_tests FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tests" ON user_tests FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Test responses policies
CREATE POLICY "Users can view own test responses" ON test_responses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own test responses" ON test_responses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own test responses" ON test_responses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own test responses" ON test_responses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Word definitions policies (shared cache)
CREATE POLICY "Authenticated users can read word definitions" ON word_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update word definitions" ON word_definitions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert word definitions" ON word_definitions FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update word definitions" ON word_definitions FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Sefaria cache policies (shared cache)
CREATE POLICY "Authenticated users can read cached Sefaria content" ON sefaria_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cache entries" ON sefaria_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cache entries" ON sefaria_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert cache entries" ON sefaria_cache FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update cache entries" ON sefaria_cache FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role can delete cache entries" ON sefaria_cache FOR DELETE TO service_role USING (true);

-- Translation cache policies
CREATE POLICY "Authenticated users can read translation cache" ON translation_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can insert translation cache" ON translation_cache FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role can update translation cache" ON translation_cache FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- URL extraction cache policies
CREATE POLICY "Authenticated users can read url extractions" ON url_extraction_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert url extractions" ON url_extraction_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update url extractions" ON url_extraction_cache FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Gemini API rate limits policies
CREATE POLICY "Users can view own rate limits" ON gemini_api_rate_limits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can log own API requests" ON gemini_api_rate_limits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User word definitions policies
CREATE POLICY "Users can read own definitions" ON user_word_definitions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own definitions" ON user_word_definitions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own definitions" ON user_word_definitions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own definitions" ON user_word_definitions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bookmark folders policies
CREATE POLICY "Users can view own folders" ON bookmark_folders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own folders" ON bookmark_folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON bookmark_folders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON bookmark_folders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookmarks" ON bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookmarks" ON bookmarks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks" ON bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- END OF SCHEMA EXPORT
-- =============================================
