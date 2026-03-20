
-- 1. Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: admins can see all roles, users can see their own
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Only service_role can manage roles
CREATE POLICY "Service role manages roles"
  ON public.user_roles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Create api_usage_logs table for persistent tracking
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  request_type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  input_tokens_estimate INTEGER DEFAULT 0,
  output_tokens_estimate INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 8) DEFAULT 0,
  cache_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs
CREATE POLICY "Admins can view all usage logs"
  ON public.api_usage_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert/manage logs
CREATE POLICY "Service role manages usage logs"
  ON public.api_usage_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_api_usage_logs_created_at ON public.api_usage_logs (created_at DESC);
CREATE INDEX idx_api_usage_logs_request_type ON public.api_usage_logs (request_type);
CREATE INDEX idx_api_usage_logs_user_id ON public.api_usage_logs (user_id);

-- 3. Cleanup function for 1-year retention
CREATE OR REPLACE FUNCTION public.cleanup_api_usage_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 4. Add retention config
INSERT INTO app_config (key, value, description)
VALUES ('api_usage_logs_retention_days', '365', 'Number of days to retain API usage logs');
