-- =====================================================================
-- Learn Ivrit — schema cloned from PRODUCTION ("Hebrew Translate")
-- Source project: production (Hebrew Translate)
-- Extracted: 2026-08-07, introspected live from pg_catalog (NOT from
-- the supabase/migrations files, which may have drifted).
--
-- Scope: public schema only. Apply to a fresh Supabase project to
-- mirror production for a test environment.
--
-- Assumes the target is a real Supabase project (the managed `auth`
-- schema exists — FKs reference auth.users — and the `extensions`
-- schema exists). Run top-to-bottom; ordering is dependency-safe.
-- pg_cron cleanup jobs are operational, not schema — add separately
-- if the test env needs them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
CREATE TABLE public.ad_config (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  config jsonb DEFAULT '{}'::jsonb NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  is_active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.admin_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  sent_email boolean DEFAULT false,
  email_sent_at timestamp with time zone,
  read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.alert_thresholds (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  threshold_percent numeric NOT NULL,
  severity text NOT NULL,
  send_email boolean DEFAULT false,
  activate_circuit_breaker boolean DEFAULT false,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.api_pricing (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  model text NOT NULL,
  prompt_cost_per_million numeric NOT NULL,
  candidates_cost_per_million numeric NOT NULL,
  thinking_cost_per_million numeric DEFAULT 0 NOT NULL,
  effective_from timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.api_usage_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id text NOT NULL,
  request_type text NOT NULL,
  endpoint text NOT NULL,
  prompt_tokens integer DEFAULT 0,
  candidates_tokens integer DEFAULT 0,
  cache_hit boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  thinking_tokens integer DEFAULT 0,
  pricing_id uuid,
  model text,
  estimated_prompt_tokens integer,
  estimated_candidates_tokens integer,
  token_variance_percent numeric
);

CREATE TABLE public.app_config (
  key text NOT NULL,
  value text NOT NULL,
  description text
);

CREATE TABLE public.bookmark_folders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  parent_folder_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.bookmarks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  folder_id uuid,
  name text NOT NULL,
  hebrew_text text NOT NULL,
  source text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.contact_submissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  message_type text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.gemini_api_rate_limits (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  request_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.monthly_spend_tracking (
  month date NOT NULL,
  total_spend numeric DEFAULT 0 NOT NULL,
  current_tier text DEFAULT 'tier1'::text NOT NULL,
  spend_cap numeric DEFAULT 250 NOT NULL,
  api_enabled boolean DEFAULT true NOT NULL,
  circuit_breaker_activated_at timestamp with time zone,
  last_updated timestamp with time zone DEFAULT now() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.page_views_daily (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  page text NOT NULL,
  view_date date DEFAULT CURRENT_DATE NOT NULL,
  view_count integer DEFAULT 1 NOT NULL,
  total_active_seconds integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.sefaria_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  reference text NOT NULL,
  content jsonb NOT NULL,
  cached_at timestamp with time zone DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now(),
  access_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  translation text
);

CREATE TABLE public.test_responses (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  test_id uuid NOT NULL,
  user_id uuid NOT NULL,
  word_id uuid NOT NULL,
  user_answer text NOT NULL,
  correct_answer text NOT NULL,
  is_correct boolean DEFAULT false,
  response_time_seconds integer,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.translation_cache (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  content_hash text NOT NULL,
  hebrew_text text NOT NULL,
  translation text NOT NULL,
  text_length integer NOT NULL,
  cached_at timestamp with time zone DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now(),
  access_count integer DEFAULT 0
);

CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role app_role NOT NULL
);

CREATE TABLE public.user_tests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  test_type text NOT NULL,
  total_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  score_percentage numeric DEFAULT 0,
  duration_seconds integer,
  completed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.vocabulary_words (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  hebrew_word text NOT NULL,
  english_translation text NOT NULL,
  definition text NOT NULL,
  transliteration text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.word_definitions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  word text NOT NULL,
  word_with_vowels text NOT NULL,
  definition text NOT NULL,
  transliteration text DEFAULT ''::text NOT NULL,
  examples jsonb DEFAULT '[]'::jsonb,
  notes text DEFAULT ''::text,
  forms jsonb DEFAULT '[]'::jsonb,
  short_english text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_accessed timestamp with time zone DEFAULT now(),
  access_count integer DEFAULT 0
);

CREATE TABLE public.word_statistics (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  word_id uuid NOT NULL,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  total_attempts integer DEFAULT 0,
  consecutive_correct integer DEFAULT 0,
  last_tested timestamp with time zone,
  confidence_score numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.activate_ad_config(config_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Deactivate all configs
  UPDATE ad_config SET is_active = false WHERE is_active = true;

  -- Activate the specified config
  UPDATE ad_config SET is_active = true WHERE id = config_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_monthly_spend()
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_month DATE;
  total NUMERIC;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  SELECT COALESCE(SUM(
    CASE
      WHEN l.cache_hit OR p.id IS NULL THEN 0
      ELSE   COALESCE(l.prompt_tokens, 0)     * p.prompt_cost_per_million     / 1000000.0
           + COALESCE(l.candidates_tokens, 0) * p.candidates_cost_per_million / 1000000.0
           + COALESCE(l.thinking_tokens, 0)   * p.thinking_cost_per_million   / 1000000.0
    END
  ), 0)
  INTO total
  FROM api_usage_logs l
  LEFT JOIN api_pricing p ON p.id = l.pricing_id
  WHERE DATE_TRUNC('month', l.created_at)::DATE = current_month;

  RETURN total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_spend_thresholds(current_spend numeric, spend_cap numeric)
 RETURNS TABLE(threshold_percent numeric, severity text, send_email boolean, activate_circuit_breaker boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  spend_percent NUMERIC;
  current_month DATE;
BEGIN
  spend_percent := (current_spend / NULLIF(spend_cap, 0)) * 100;
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  RETURN QUERY
  SELECT
    t.threshold_percent,
    t.severity,
    t.send_email,
    t.activate_circuit_breaker
  FROM alert_thresholds t
  WHERE t.enabled = true
    AND spend_percent >= t.threshold_percent
    AND NOT EXISTS (
      SELECT 1 FROM admin_alerts a
      WHERE a.alert_type = 'spend_cap_warning'
        AND (a.metadata->>'threshold_percent')::NUMERIC = t.threshold_percent
        AND (a.metadata->>'month')::DATE = current_month
    )
  ORDER BY t.threshold_percent;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_api_usage_logs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
  retention_days INTEGER;
BEGIN
  SELECT COALESCE(value::integer, 365) INTO retention_days
  FROM app_config WHERE key = 'api_usage_logs_retention_days';

  DELETE FROM api_usage_logs
  WHERE created_at < now() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_gemini_api_rate_limits()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  retention_hours integer;
BEGIN
  SELECT COALESCE(value::integer, 24) INTO retention_hours
  FROM app_config WHERE key = 'rate_limit_retention_hours';

  DELETE FROM public.gemini_api_rate_limits
  WHERE created_at < now() - (retention_hours || ' hours')::interval;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_sefaria_cache()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
  retention_days integer;
  max_retention_days integer;
BEGIN
  SELECT COALESCE(value::integer, 90) INTO retention_days
  FROM app_config WHERE key = 'sefaria_cache_retention_days';

  SELECT COALESCE(value::integer, 120) INTO max_retention_days
  FROM app_config WHERE key = 'sefaria_cache_max_retention_days';

  DELETE FROM sefaria_cache
  WHERE (last_accessed < now() - (retention_days || ' days')::interval AND access_count < 3)
     OR last_accessed < now() - (max_retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_translation_cache()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
  retention_days integer;
BEGIN
  SELECT COALESCE(value::integer, 30) INTO retention_days
  FROM app_config WHERE key = 'translation_cache_retention_days';

  DELETE FROM translation_cache
  WHERE last_accessed < now() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_word_definitions_cache()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
  retention_days integer;
BEGIN
  SELECT COALESCE(value::integer, 30) INTO retention_days
  FROM app_config WHERE key = 'word_definitions_retention_days';

  DELETE FROM word_definitions
  WHERE last_accessed < now() - (retention_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_spend_alert(p_threshold_percent numeric, p_severity text, p_send_email boolean, p_current_spend numeric, p_spend_cap numeric, p_current_tier text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  alert_id UUID;
  spend_percent NUMERIC;
  remaining NUMERIC;
  current_month DATE;
  alert_title TEXT;
  alert_message TEXT;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  spend_percent := ROUND((p_current_spend / NULLIF(p_spend_cap, 0)) * 100, 1);
  remaining := p_spend_cap - p_current_spend;

  -- Build alert title and message based on threshold
  IF p_threshold_percent = 50 THEN
    alert_title := 'Monthly Spend Checkpoint';
    alert_message := format(
      'You''ve used %s%% of your %s monthly budget ($%s / $%s). Current pace: Monitor usage to avoid service interruption.',
      spend_percent, p_current_tier, ROUND(p_current_spend, 2), p_spend_cap
    );
  ELSIF p_threshold_percent = 80 THEN
    alert_title := 'Approaching Spend Limit';
    alert_message := format(
      'You''ve used %s%% of your %s monthly budget ($%s / $%s). Action required: Monitor usage closely. Only $%s remaining. Service will suspend when cap is reached.',
      spend_percent, p_current_tier, ROUND(p_current_spend, 2), p_spend_cap, ROUND(remaining, 2)
    );
  ELSIF p_threshold_percent >= 95 THEN
    alert_title := 'CRITICAL: Spend Limit Nearly Reached';
    alert_message := format(
      'You''ve used %s%% of your %s monthly budget ($%s / $%s). Circuit breaker activated: Gemini API calls are now blocked to prevent overage charges. You have $%s remaining. Service suspends at $%s.',
      spend_percent, p_current_tier, ROUND(p_current_spend, 2), p_spend_cap, ROUND(remaining, 2), p_spend_cap
    );
  ELSE
    alert_title := format('Spend Alert: %s%%', p_threshold_percent);
    alert_message := format(
      'You''ve used %s%% of your %s monthly budget ($%s / $%s).',
      spend_percent, p_current_tier, ROUND(p_current_spend, 2), p_spend_cap
    );
  END IF;

  -- Create alert record
  INSERT INTO admin_alerts (
    alert_type,
    severity,
    title,
    message,
    metadata,
    sent_email
  ) VALUES (
    'spend_cap_warning',
    p_severity,
    alert_title,
    alert_message,
    jsonb_build_object(
      'threshold_percent', p_threshold_percent,
      'current_spend', p_current_spend,
      'spend_cap', p_spend_cap,
      'spend_percent', spend_percent,
      'remaining', remaining,
      'current_tier', p_current_tier,
      'month', current_month,
      'send_email', p_send_email
    ),
    false
  )
  RETURNING id INTO alert_id;

  RETURN alert_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  DELETE FROM auth.users WHERE id = current_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Account successfully deleted'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.increment_translation_access(cache_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE translation_cache
  SET
    access_count = access_count + 1,
    last_accessed = now()
  WHERE id = cache_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_active_ad_config(config_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_id uuid;
  new_version integer;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO new_version FROM ad_config;

  -- Deactivate all existing configs
  UPDATE ad_config SET is_active = false WHERE is_active = true;

  -- Insert new config as active
  INSERT INTO ad_config (config, version, is_active)
  VALUES (config_data, new_version, true)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_page_view(p_page text, p_active_seconds integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO page_views_daily (page, view_date, view_count, total_active_seconds)
  VALUES (p_page, CURRENT_DATE, 1, p_active_seconds)
  ON CONFLICT (page, view_date)
  DO UPDATE SET
    view_count = page_views_daily.view_count + 1,
    total_active_seconds = page_views_daily.total_active_seconds + EXCLUDED.total_active_seconds;
END;
$function$;

CREATE OR REPLACE FUNCTION public.monitor_api_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_month DATE;
  total_spend NUMERIC;
  current_cap NUMERIC;
  current_tier TEXT;
  api_status BOOLEAN;
  threshold_record RECORD;
  alert_id UUID;
  should_activate_breaker BOOLEAN;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Calculate current month's total spend
  total_spend := calculate_monthly_spend();

  -- Get or create monthly tracking record
  INSERT INTO monthly_spend_tracking (month, total_spend)
  VALUES (current_month, total_spend)
  ON CONFLICT (month) DO UPDATE
  SET
    total_spend = total_spend,
    last_updated = now()
  RETURNING spend_cap, current_tier, api_enabled
  INTO current_cap, current_tier, api_status;

  -- Check for threshold crossings
  should_activate_breaker := false;

  FOR threshold_record IN
    SELECT * FROM check_spend_thresholds(total_spend, current_cap)
  LOOP
    -- Create alert for this threshold
    alert_id := create_spend_alert(
      threshold_record.threshold_percent,
      threshold_record.severity,
      threshold_record.send_email,
      total_spend,
      current_cap,
      current_tier
    );

    -- Check if we need to activate circuit breaker
    IF threshold_record.activate_circuit_breaker THEN
      should_activate_breaker := true;
    END IF;
  END LOOP;

  -- Activate circuit breaker if needed
  IF should_activate_breaker AND api_status = true THEN
    UPDATE monthly_spend_tracking
    SET
      api_enabled = false,
      circuit_breaker_activated_at = now(),
      last_updated = now()
    WHERE month = current_month;

    -- Create circuit breaker activation alert
    INSERT INTO admin_alerts (
      alert_type,
      severity,
      title,
      message,
      metadata
    ) VALUES (
      'circuit_breaker_activated',
      'critical',
      'Circuit Breaker Activated',
      format(
        'Gemini API calls have been automatically disabled to prevent service suspension. Current spend: $%s / $%s (95%% threshold reached). Users will see a graceful degradation message instead of API errors.',
        ROUND(total_spend, 2), current_cap
      ),
      jsonb_build_object(
        'current_spend', total_spend,
        'spend_cap', current_cap,
        'current_tier', current_tier,
        'month', current_month,
        'activated_at', now()
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to monitor API usage: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_admin_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  function_url text;
  project_url text;
  should_send_email boolean;
BEGIN
  should_send_email := COALESCE((NEW.metadata->>'send_email')::boolean, false);

  IF NOT should_send_email THEN
    RETURN NEW;
  END IF;

  project_url := current_setting('app.settings.supabase_url', true);
  IF project_url IS NULL THEN
    project_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;

  function_url := project_url || '/functions/v1/send-notification-email';

  PERFORM extensions.http((
    'POST',
    function_url,
    ARRAY[extensions.http_header('Content-Type', 'application/json')],
    'application/json',
    json_build_object(
      'id', NEW.id,
      'alert_type', NEW.alert_type,
      'severity', NEW.severity,
      'title', NEW.title,
      'message', NEW.message,
      'metadata', NEW.metadata,
      'created_at', NEW.created_at
    )::text
  )::extensions.http_request);

  UPDATE admin_alerts
  SET
    sent_email = true,
    email_sent_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to send alert email notification: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_complete_test_results(p_user_id uuid, p_test_type text, p_total_questions integer, p_correct_answers integer, p_score_percentage numeric, p_duration_seconds integer, p_responses jsonb, p_statistics jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.select_test_words(p_user_id uuid, p_limit integer)
 RETURNS TABLE(id uuid, user_id uuid, hebrew_word text, english_translation text, definition text, transliteration text, created_at timestamp with time zone, updated_at timestamp with time zone, stats jsonb)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_ad_config_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_contact_submissions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vocabulary_with_stats AS
 SELECT vw.id,
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

-- ---------------------------------------------------------------------
-- Constraints (primary keys, unique, check, foreign keys)
-- ---------------------------------------------------------------------
ALTER TABLE public.ad_config ADD CONSTRAINT ad_config_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_alerts ADD CONSTRAINT admin_alerts_pkey PRIMARY KEY (id);
ALTER TABLE public.admin_alerts ADD CONSTRAINT admin_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['spend_cap_warning'::text, 'tier_progress'::text, 'service_suspended'::text, 'circuit_breaker_activated'::text])));
ALTER TABLE public.admin_alerts ADD CONSTRAINT admin_alerts_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])));
ALTER TABLE public.alert_thresholds ADD CONSTRAINT alert_thresholds_pkey PRIMARY KEY (id);
ALTER TABLE public.alert_thresholds ADD CONSTRAINT alert_thresholds_threshold_percent_key UNIQUE (threshold_percent);
ALTER TABLE public.alert_thresholds ADD CONSTRAINT alert_thresholds_severity_check CHECK ((severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])));
ALTER TABLE public.alert_thresholds ADD CONSTRAINT alert_thresholds_threshold_percent_check CHECK (((threshold_percent > (0)::numeric) AND (threshold_percent <= (100)::numeric)));
ALTER TABLE public.api_pricing ADD CONSTRAINT api_pricing_pkey PRIMARY KEY (id);
ALTER TABLE public.api_usage_logs ADD CONSTRAINT api_usage_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.app_config ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);
ALTER TABLE public.bookmark_folders ADD CONSTRAINT bookmark_folders_pkey PRIMARY KEY (id);
ALTER TABLE public.bookmark_folders ADD CONSTRAINT bookmark_folders_user_id_parent_folder_id_name_key UNIQUE (user_id, parent_folder_id, name);
ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (id);
ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_user_id_folder_id_name_key UNIQUE (user_id, folder_id, name);
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_pkey PRIMARY KEY (id);
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_message_type_check CHECK ((message_type = ANY (ARRAY['bug'::text, 'feature'::text, 'question'::text, 'other'::text])));
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text])));
ALTER TABLE public.gemini_api_rate_limits ADD CONSTRAINT gemini_api_rate_limits_pkey PRIMARY KEY (id);
ALTER TABLE public.gemini_api_rate_limits ADD CONSTRAINT gemini_api_rate_limits_request_type_check CHECK ((request_type = ANY (ARRAY['word_definition'::text, 'passage_translation'::text])));
ALTER TABLE public.monthly_spend_tracking ADD CONSTRAINT monthly_spend_tracking_pkey PRIMARY KEY (month);
ALTER TABLE public.page_views_daily ADD CONSTRAINT page_views_daily_pkey PRIMARY KEY (id);
ALTER TABLE public.page_views_daily ADD CONSTRAINT page_views_daily_page_view_date_key UNIQUE (page, view_date);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE public.sefaria_cache ADD CONSTRAINT sefaria_cache_pkey PRIMARY KEY (id);
ALTER TABLE public.sefaria_cache ADD CONSTRAINT sefaria_cache_reference_key UNIQUE (reference);
ALTER TABLE public.test_responses ADD CONSTRAINT test_responses_pkey PRIMARY KEY (id);
ALTER TABLE public.translation_cache ADD CONSTRAINT translation_cache_pkey PRIMARY KEY (id);
ALTER TABLE public.translation_cache ADD CONSTRAINT translation_cache_content_hash_key UNIQUE (content_hash);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_tests ADD CONSTRAINT user_tests_pkey PRIMARY KEY (id);
ALTER TABLE public.vocabulary_words ADD CONSTRAINT vocabulary_words_pkey PRIMARY KEY (id);
ALTER TABLE public.word_definitions ADD CONSTRAINT word_definitions_pkey PRIMARY KEY (id);
ALTER TABLE public.word_definitions ADD CONSTRAINT word_definitions_word_key UNIQUE (word);
ALTER TABLE public.word_statistics ADD CONSTRAINT word_statistics_pkey PRIMARY KEY (id);
ALTER TABLE public.word_statistics ADD CONSTRAINT word_statistics_user_id_word_id_key UNIQUE (user_id, word_id);
ALTER TABLE public.word_statistics ADD CONSTRAINT check_confidence_score_range CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (100)::numeric)));
ALTER TABLE public.word_statistics ADD CONSTRAINT check_consecutive_correct_non_negative CHECK ((consecutive_correct >= 0));
ALTER TABLE public.word_statistics ADD CONSTRAINT check_correct_count_non_negative CHECK ((correct_count >= 0));
ALTER TABLE public.word_statistics ADD CONSTRAINT check_incorrect_count_non_negative CHECK ((incorrect_count >= 0));
ALTER TABLE public.word_statistics ADD CONSTRAINT check_total_attempts_non_negative CHECK ((total_attempts >= 0));

-- Foreign keys (added after all PK/UNIQUE targets exist)
ALTER TABLE public.api_usage_logs ADD CONSTRAINT api_usage_logs_pricing_id_fkey FOREIGN KEY (pricing_id) REFERENCES api_pricing(id);
ALTER TABLE public.bookmark_folders ADD CONSTRAINT bookmark_folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES bookmark_folders(id) ON DELETE CASCADE;
ALTER TABLE public.bookmark_folders ADD CONSTRAINT bookmark_folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES bookmark_folders(id) ON DELETE CASCADE;
ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.contact_submissions ADD CONSTRAINT contact_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.gemini_api_rate_limits ADD CONSTRAINT gemini_api_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.test_responses ADD CONSTRAINT test_responses_test_id_fkey FOREIGN KEY (test_id) REFERENCES user_tests(id) ON DELETE CASCADE;
ALTER TABLE public.test_responses ADD CONSTRAINT test_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.test_responses ADD CONSTRAINT test_responses_word_id_fkey FOREIGN KEY (word_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_tests ADD CONSTRAINT user_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.vocabulary_words ADD CONSTRAINT vocabulary_words_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.word_statistics ADD CONSTRAINT word_statistics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.word_statistics ADD CONSTRAINT word_statistics_word_id_fkey FOREIGN KEY (word_id) REFERENCES vocabulary_words(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- Indexes (non-constraint)
-- ---------------------------------------------------------------------
CREATE UNIQUE INDEX idx_ad_config_single_active ON public.ad_config USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_admin_alerts_created_at ON public.admin_alerts USING btree (created_at DESC);
CREATE INDEX idx_admin_alerts_read ON public.admin_alerts USING btree (read, created_at DESC);
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs USING btree (created_at DESC);
CREATE INDEX idx_api_usage_logs_request_type ON public.api_usage_logs USING btree (request_type);
CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs USING btree (user_id);
CREATE INDEX idx_contact_submissions_created_at ON public.contact_submissions USING btree (created_at DESC);
CREATE INDEX idx_contact_submissions_status ON public.contact_submissions USING btree (status);
CREATE INDEX idx_contact_submissions_user_id ON public.contact_submissions USING btree (user_id);
CREATE INDEX idx_gemini_rate_limits_user_type_time ON public.gemini_api_rate_limits USING btree (user_id, request_type, created_at DESC);
CREATE INDEX idx_sefaria_cached_at ON public.sefaria_cache USING btree (cached_at);
CREATE INDEX idx_sefaria_last_accessed ON public.sefaria_cache USING btree (last_accessed);
CREATE INDEX idx_sefaria_reference ON public.sefaria_cache USING btree (reference);
CREATE INDEX idx_test_responses_test_id ON public.test_responses USING btree (test_id);
CREATE INDEX idx_test_responses_test_user ON public.test_responses USING btree (test_id, user_id);
CREATE INDEX idx_test_responses_user_id ON public.test_responses USING btree (user_id);
CREATE INDEX idx_test_responses_word_id ON public.test_responses USING btree (word_id);
CREATE INDEX idx_translation_cache_access_count ON public.translation_cache USING btree (access_count);
CREATE INDEX idx_translation_cache_hash ON public.translation_cache USING btree (content_hash);
CREATE INDEX idx_translation_cache_last_accessed ON public.translation_cache USING btree (last_accessed);
CREATE INDEX idx_user_tests_completed_at ON public.user_tests USING btree (completed_at);
CREATE INDEX idx_user_tests_user_completed ON public.user_tests USING btree (user_id, completed_at DESC);
CREATE INDEX idx_user_tests_user_id ON public.user_tests USING btree (user_id);
CREATE INDEX idx_vocabulary_words_hebrew_word ON public.vocabulary_words USING btree (hebrew_word);
CREATE INDEX idx_vocabulary_words_user_created ON public.vocabulary_words USING btree (user_id, created_at DESC);
CREATE INDEX idx_vocabulary_words_user_id ON public.vocabulary_words USING btree (user_id);
CREATE INDEX idx_word_definitions_access_count ON public.word_definitions USING btree (access_count);
CREATE INDEX idx_word_definitions_created_at ON public.word_definitions USING btree (created_at);
CREATE INDEX idx_word_definitions_last_accessed ON public.word_definitions USING btree (last_accessed);
CREATE INDEX idx_word_definitions_word ON public.word_definitions USING btree (word);
CREATE INDEX idx_word_definitions_word_accessed ON public.word_definitions USING btree (word, last_accessed);
CREATE INDEX idx_word_statistics_confidence ON public.word_statistics USING btree (confidence_score);
CREATE INDEX idx_word_statistics_user_confidence ON public.word_statistics USING btree (user_id, confidence_score);
CREATE INDEX idx_word_statistics_user_id ON public.word_statistics USING btree (user_id);
CREATE INDEX idx_word_statistics_user_last_tested ON public.word_statistics USING btree (user_id, last_tested);
CREATE INDEX idx_word_statistics_user_word ON public.word_statistics USING btree (user_id, word_id);
CREATE INDEX idx_word_statistics_word_id ON public.word_statistics USING btree (word_id);

-- ---------------------------------------------------------------------
-- Row Level Security — enable
-- ---------------------------------------------------------------------
ALTER TABLE public.ad_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gemini_api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_spend_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sefaria_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_statistics ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Row Level Security — policies
-- ---------------------------------------------------------------------
CREATE POLICY "Admins can delete ad config" ON public.ad_config AS PERMISSIVE FOR DELETE TO authenticated
  USING ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can insert ad config" ON public.ad_config AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can read ad config" ON public.ad_config AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Admins can update ad config" ON public.ad_config AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))))
  WITH CHECK ((EXISTS ( SELECT 1 FROM user_roles WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::app_role)))));
CREATE POLICY "Authenticated users can update alerts" ON public.admin_alerts AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Authenticated users can view alerts" ON public.admin_alerts AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "System can insert alerts" ON public.admin_alerts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users can view thresholds" ON public.alert_thresholds AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "System can manage thresholds" ON public.alert_thresholds AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Admins can view pricing" ON public.api_pricing AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages pricing" ON public.api_pricing AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Admins can view all usage logs" ON public.api_usage_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can insert usage logs" ON public.api_usage_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Service role manages usage logs" ON public.api_usage_logs AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Service role can manage config" ON public.app_config AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Service role can read config" ON public.app_config AS PERMISSIVE FOR SELECT TO service_role
  USING (true);
CREATE POLICY "Users can create own folders" ON public.bookmark_folders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete own folders" ON public.bookmark_folders AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own folders" ON public.bookmark_folders AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own folders" ON public.bookmark_folders AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can create own bookmarks" ON public.bookmarks AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks AS PERMISSIVE FOR DELETE TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can update own bookmarks" ON public.bookmarks AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Users can view own submissions" ON public.contact_submissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can log own API requests" ON public.gemini_api_rate_limits AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Users can view own rate limits" ON public.gemini_api_rate_limits AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can view spend tracking" ON public.monthly_spend_tracking AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "System can manage spend tracking" ON public.monthly_spend_tracking AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Admins can view page analytics" ON public.page_views_daily AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages page views" ON public.page_views_daily AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = id));
CREATE POLICY "Authenticated users can insert cache entries" ON public.sefaria_cache AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users can read cached Sefaria content" ON public.sefaria_cache AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can update cache entries" ON public.sefaria_cache AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Service role can delete cache entries" ON public.sefaria_cache AS PERMISSIVE FOR DELETE TO service_role
  USING (true);
CREATE POLICY "Service role can insert cache entries" ON public.sefaria_cache AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update cache entries" ON public.sefaria_cache AS PERMISSIVE FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Users can delete own test responses" ON public.test_responses AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own test responses" ON public.test_responses AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own test responses" ON public.test_responses AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own test responses" ON public.test_responses AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Authenticated users can read translation cache" ON public.translation_cache AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Service role can insert translation cache" ON public.translation_cache AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update translation cache" ON public.translation_cache AS PERMISSIVE FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Admins can view all roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages roles" ON public.user_roles AS PERMISSIVE FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Users can view own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Users can delete own tests" ON public.user_tests AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own tests" ON public.user_tests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own tests" ON public.user_tests AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own tests" ON public.user_tests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can delete own vocabulary" ON public.vocabulary_words AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own vocabulary" ON public.vocabulary_words AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own vocabulary" ON public.vocabulary_words AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own vocabulary" ON public.vocabulary_words AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own vocabulary with stats" ON public.vocabulary_words AS PERMISSIVE FOR SELECT TO authenticated
  USING ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can read word definitions" ON public.word_definitions AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Authenticated users can update word definitions" ON public.word_definitions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Service role can insert word definitions" ON public.word_definitions AS PERMISSIVE FOR INSERT TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update word definitions" ON public.word_definitions AS PERMISSIVE FOR UPDATE TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Users can delete own word statistics" ON public.word_statistics AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own word statistics" ON public.word_statistics AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own word statistics" ON public.word_statistics AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own word statistics" ON public.word_statistics AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
CREATE TRIGGER trigger_update_ad_config_updated_at BEFORE UPDATE ON public.ad_config FOR EACH ROW EXECUTE FUNCTION update_ad_config_updated_at();
CREATE TRIGGER on_admin_alert_notify AFTER INSERT ON public.admin_alerts FOR EACH ROW EXECUTE FUNCTION notify_admin_alert();
CREATE TRIGGER after_api_usage_monitor_spend AFTER INSERT ON public.api_usage_logs FOR EACH ROW EXECUTE FUNCTION monitor_api_usage();
CREATE TRIGGER update_bookmark_folders_updated_at BEFORE UPDATE ON public.bookmark_folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookmarks_updated_at BEFORE UPDATE ON public.bookmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_submissions_updated_at BEFORE UPDATE ON public.contact_submissions FOR EACH ROW EXECUTE FUNCTION update_contact_submissions_updated_at();
CREATE TRIGGER update_gemini_api_rate_limits_updated_at BEFORE UPDATE ON public.gemini_api_rate_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vocabulary_words_updated_at BEFORE UPDATE ON public.vocabulary_words FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_word_statistics_updated_at BEFORE UPDATE ON public.word_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------
COMMENT ON TABLE public.translation_cache IS 'Caches translation results from Google Gemini API. Entries automatically expire after 30 days of inactivity to comply with API terms. Cleanup is performed daily via pg_cron job calling cleanup_translation_cache().';
COMMENT ON TABLE public.word_definitions IS 'Caches word definitions from Google Gemini API. Entries automatically expire after 30 days of inactivity to comply with API terms. Cleanup is performed daily via pg_cron job calling cleanup_word_definitions_cache().';

-- ---------------------------------------------------------------------
-- Grants (anon / authenticated / service_role) — mirrors production
-- ---------------------------------------------------------------------
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ad_config TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ad_config TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.ad_config TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_alerts TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_alerts TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.admin_alerts TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.alert_thresholds TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.alert_thresholds TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.alert_thresholds TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.api_pricing TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.api_pricing TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.api_pricing TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.api_usage_logs TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.api_usage_logs TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.api_usage_logs TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.app_config TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.app_config TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.app_config TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.bookmark_folders TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.bookmark_folders TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.bookmark_folders TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.bookmarks TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.bookmarks TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.bookmarks TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_submissions TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_submissions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contact_submissions TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.gemini_api_rate_limits TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.gemini_api_rate_limits TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.gemini_api_rate_limits TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.monthly_spend_tracking TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.monthly_spend_tracking TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.monthly_spend_tracking TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.page_views_daily TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.page_views_daily TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.page_views_daily TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.profiles TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.sefaria_cache TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.sefaria_cache TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.sefaria_cache TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.test_responses TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.test_responses TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.test_responses TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.translation_cache TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.translation_cache TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.translation_cache TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_roles TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_roles TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_roles TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_tests TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_tests TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.user_tests TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.vocabulary_with_stats TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.vocabulary_with_stats TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.vocabulary_with_stats TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.vocabulary_words TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.vocabulary_words TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.vocabulary_words TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.word_definitions TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.word_definitions TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.word_definitions TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.word_statistics TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.word_statistics TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.word_statistics TO service_role;
