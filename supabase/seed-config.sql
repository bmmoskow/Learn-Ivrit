-- =====================================================================
-- seed-config.sql — essential app config, mirrored from PRODUCTION.
-- Used by reset-env.sh as step 3 of a full reset (after schema is applied).
--
-- Scope: CONFIG ONLY. No user data. These three tables must be populated
-- for the app / functions to behave (pricing math, cache retention, spend
-- alerts). ON CONFLICT DO NOTHING makes this safe to re-run.
--
-- Intentionally NOT seeded here: ad_config (ad-display config, irrelevant
-- to tests — a sandbox that needs ads can add rows manually) and all
-- user/cache tables (left empty by design).
--
-- Keep in sync with prod if these values change (see api_pricing note).
-- =====================================================================

-- api_pricing: current Gemini 2.5 Flash rates (corrected 2026-08-10, PR #168).
INSERT INTO public.api_pricing
  (id, model, prompt_cost_per_million, candidates_cost_per_million, thinking_cost_per_million, effective_from, created_at)
VALUES
  ('ad58cd5a-b429-493f-9526-ff2e9886defd','gemini-2.5-flash',0.3,2.5,2.5,'2025-01-01T00:00:00+00:00','2026-03-16T20:45:03.519983+00:00')
ON CONFLICT (id) DO NOTHING;

-- app_config: cache/log retention windows read by cleanup functions.
INSERT INTO public.app_config (key, value, description) VALUES
  ('translation_cache_retention_days','30','Days before translation cache entries are deleted'),
  ('word_definitions_retention_days','30','Days before word definition entries are deleted'),
  ('sefaria_cache_retention_days','90','Days before low-access Sefaria cache entries are deleted'),
  ('sefaria_cache_max_retention_days','120','Maximum days before any Sefaria cache entry is deleted'),
  ('rate_limit_retention_hours','24','Hours before rate limit records are deleted'),
  ('api_usage_logs_retention_days','365','Number of days to retain API usage logs')
ON CONFLICT (key) DO NOTHING;

-- alert_thresholds: spend-cap warning tiers (drive check_spend_thresholds).
INSERT INTO public.alert_thresholds
  (id, threshold_percent, severity, send_email, activate_circuit_breaker, enabled, created_at)
VALUES
  ('803b811a-2c2c-45be-999d-15c876904949',50,'info',false,false,true,'2026-04-02T16:10:10.705695+00:00'),
  ('8596b855-f6c8-4611-8a34-d4d6dcd45134',80,'warning',true,false,true,'2026-04-02T16:10:10.705695+00:00'),
  ('76e5f634-7013-46ca-9fbd-7f30e20e96c0',95,'critical',true,true,true,'2026-04-02T16:10:10.705695+00:00')
ON CONFLICT (id) DO NOTHING;
