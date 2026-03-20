<<<<<<< HEAD

-- Pricing versioning table
CREATE TABLE public.api_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  prompt_cost_per_million numeric NOT NULL,
  candidates_cost_per_million numeric NOT NULL,
  thinking_cost_per_million numeric NOT NULL DEFAULT 0,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service_role and admins can manage pricing
ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages pricing"
  ON public.api_pricing FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view pricing"
  ON public.api_pricing FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add pricing_id and model to usage logs
ALTER TABLE public.api_usage_logs
  ADD COLUMN pricing_id uuid REFERENCES public.api_pricing(id),
  ADD COLUMN model text;

-- Seed current Gemini 2.5 Flash pricing (as of March 2026)
INSERT INTO public.api_pricing (model, prompt_cost_per_million, candidates_cost_per_million, thinking_cost_per_million, effective_from)
VALUES ('gemini-2.5-flash', 0.15, 0.60, 0.60, '2025-01-01T00:00:00Z');
=======

-- Pricing versioning table
CREATE TABLE public.api_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  prompt_cost_per_million numeric NOT NULL,
  candidates_cost_per_million numeric NOT NULL,
  thinking_cost_per_million numeric NOT NULL DEFAULT 0,
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only service_role and admins can manage pricing
ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages pricing"
  ON public.api_pricing FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Admins can view pricing"
  ON public.api_pricing FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add pricing_id and model to usage logs
ALTER TABLE public.api_usage_logs
  ADD COLUMN pricing_id uuid REFERENCES public.api_pricing(id),
  ADD COLUMN model text;

-- Seed current Gemini 2.5 Flash pricing (as of March 2026)
INSERT INTO public.api_pricing (model, prompt_cost_per_million, candidates_cost_per_million, thinking_cost_per_million, effective_from)
VALUES ('gemini-2.5-flash', 0.15, 0.60, 0.60, '2025-01-01T00:00:00Z');
>>>>>>> b7894df8078cd44dd9b5d2b90c24436d3b548327
