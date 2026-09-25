-- Fix calculate_monthly_spend() — issue #120.
--
-- The function summed a non-existent column: `SELECT SUM(cost) FROM api_usage_logs`.
-- api_usage_logs has no `cost` column — the old `estimated_cost_usd` column was
-- dropped in migration 20260317052833 ("costs will be calculated by joining
-- api_pricing"), but this function was never updated. It therefore errored at
-- runtime; the monitor_api_usage() trigger swallows that error (EXCEPTION WHEN
-- OTHERS ... RAISE WARNING), so monthly spend silently stayed 0 and the spend
-- circuit breaker never engaged.
--
-- Cost is now computed by joining api_pricing on pricing_id and multiplying token
-- counts by the per-million rates — matching the canonical client logic in
-- src/components/Admin/adminUtils.ts (computeCost): cache hits cost 0, and rows
-- without a matching pricing row cost 0.
--
-- Also pins search_path (SECURITY DEFINER hardening; the original left it mutable).

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
