-- Fix: make vocabulary_with_stats a security_invoker view.
--
-- A view without security_invoker runs with its OWNER's privileges, so querying
-- it bypasses the caller's row level security on the underlying tables. Prod was
-- already corrected directly (security_invoker=true), but that fix never made it
-- into the baseline schema, so the test DB still had the exposed (definer) view.
-- This migration brings every environment in line: it corrects the test DB when
-- it flows through the integration stage, and is a harmless no-op on prod.
--
-- Caught by supabase/security-lint.sql (the db-advisors CI check).

ALTER VIEW public.vocabulary_with_stats SET (security_invoker = true);
