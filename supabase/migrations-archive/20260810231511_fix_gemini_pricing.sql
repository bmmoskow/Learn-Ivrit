-- Correct the stale gemini-2.5-flash rates in api_pricing.
--
-- The single api_pricing row had $0.15 input / $0.60 output / $0.60 thinking —
-- early-2025 *preview* rates that never actually applied to this project's usage
-- (which is 2026+). Actual Gemini 2.5 Flash Standard pricing, per
-- https://ai.google.dev/gemini-api/docs/pricing:
--   input  $0.30 / 1M tokens (text/image/video)
--   output $2.50 / 1M tokens (thinking billed as output)
--
-- This is a CORRECTION of an erroneous value, not a pricing change over time, so
-- it UPDATEs the existing row (every api_usage_logs row references it via
-- pricing_id) rather than adding a new effective-dated row — correcting the app's
-- cost estimate and the spend circuit breaker for all data at once. Validated
-- against real Google bills: corrected estimates match Apr–Jul actuals closely.
--
-- Applied to production manually (2026-08-10); this file is the repo record.

UPDATE public.api_pricing
SET prompt_cost_per_million     = 0.30,
    candidates_cost_per_million = 2.50,
    thinking_cost_per_million   = 2.50
WHERE model = 'gemini-2.5-flash';
