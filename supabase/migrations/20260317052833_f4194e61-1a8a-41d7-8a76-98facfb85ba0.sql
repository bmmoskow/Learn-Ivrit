<<<<<<< HEAD

-- Clear all existing logs (old data has no pricing_id anyway)
TRUNCATE TABLE public.api_usage_logs;

-- Drop the estimated_cost_usd column - costs will be calculated by joining api_pricing
ALTER TABLE public.api_usage_logs DROP COLUMN IF EXISTS estimated_cost_usd;
=======

-- Clear all existing logs (old data has no pricing_id anyway)
TRUNCATE TABLE public.api_usage_logs;

-- Drop the estimated_cost_usd column - costs will be calculated by joining api_pricing
ALTER TABLE public.api_usage_logs DROP COLUMN IF EXISTS estimated_cost_usd;
>>>>>>> b7894df8078cd44dd9b5d2b90c24436d3b548327
