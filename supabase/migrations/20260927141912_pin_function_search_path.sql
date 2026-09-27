-- Pin search_path on the public functions that had a mutable one.
--
-- A function without a fixed search_path resolves unqualified names against the
-- caller's search_path, which is a privilege-escalation vector — most acute for
-- the SECURITY DEFINER functions here (a caller could shadow a referenced object
-- via a temp table or a schema they control). Flagged by supabase/security-lint.sql
-- (function_search_path_mutable) on both hosted DBs.
--
-- All 8 bodies reference public objects by UNQUALIFIED name (ad_config,
-- admin_alerts, monthly_spend_tracking, check_spend_thresholds(), ...); the one
-- extension call (notify_admin_alert -> extensions.http) is already fully
-- qualified. So `public, pg_temp` preserves behavior while pinning the path;
-- pg_temp is placed LAST so a caller's temp objects can't shadow public ones.
-- (A stricter `search_path = ''` would break these, since the bodies are not
-- schema-qualified.)
--
-- Idempotent: ALTER FUNCTION ... SET is a no-op if already set to this value.

ALTER FUNCTION public.activate_ad_config(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.check_spend_thresholds(numeric, numeric)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.create_spend_alert(numeric, text, boolean, numeric, numeric, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.insert_active_ad_config(jsonb)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.monitor_api_usage()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.notify_admin_alert()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_ad_config_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_contact_submissions_updated_at()
  SET search_path = public, pg_temp;
