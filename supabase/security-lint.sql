-- DB security lint — run against a database AFTER migrations are applied.
--
-- Returns one row per finding: severity | lint | object | detail
--   ERROR  a real exposure.
--   WARN   best-practice / lower-urgency.
-- The CI gate (db-advisors.yml) fails on ANY finding — the baseline is zero, so
-- severity conveys urgency in the logs, not whether it blocks.
--
-- This is a curated subset of Supabase's own security advisors (splinter),
-- run over the existing DB connection so no account-wide token is needed.
-- Keep it in step with the dashboard advisors when Supabase adds checks.
--
-- Scope note: only the `public` schema is linted (the schema reachable by the
-- anon/authenticated API roles). Supabase-managed schemas (auth, storage, etc.)
-- are owned by the platform and out of scope.

WITH findings AS (

  -- 1. RLS disabled on a public table: rows are reachable through the API with
  --    no row filtering at all. The single most important check.
  SELECT 'ERROR'::text AS severity,
         'rls_disabled'::text AS lint,
         format('%I.%I', n.nspname, c.relname)::text AS object,
         'table in public has row level security DISABLED'::text AS detail
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false

  UNION ALL

  -- 2. Policies exist but RLS is disabled: the policies look protective but are
  --    NOT enforced — a dangerous false sense of security.
  SELECT 'ERROR',
         'policy_exists_rls_disabled',
         format('%I.%I', p.schemaname, p.tablename),
         'table has ' || count(*) || ' polic' || CASE WHEN count(*) = 1 THEN 'y' ELSE 'ies' END
           || ' but RLS is DISABLED — the policies are not enforced'
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = p.schemaname AND c.relname = p.tablename
        AND c.relkind = 'r' AND c.relrowsecurity = false
    )
  GROUP BY p.schemaname, p.tablename

  UNION ALL

  -- 3. View that runs with definer privileges (not security_invoker): querying
  --    it bypasses the caller's RLS on the underlying tables. Supabase's
  --    security_definer_view advisor flags these as errors.
  SELECT 'ERROR',
         'security_definer_view',
         format('%I.%I', n.nspname, c.relname),
         'view is not security_invoker — it runs with the owner''s privileges and can bypass RLS on underlying tables'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND NOT COALESCE(
          (SELECT (option_value)::boolean
             FROM pg_options_to_table(c.reloptions)
            WHERE option_name = 'security_invoker'),
          false)

  UNION ALL

  -- 4. View that references auth.users: a common way to accidentally expose
  --    auth data (emails, etc.) to the anon/authenticated roles.
  SELECT 'ERROR',
         'auth_users_exposed',
         format('%I.%I', schemaname, viewname),
         'view in public references auth.users — may expose auth data to API clients'
  FROM pg_views
  WHERE schemaname = 'public'
    AND definition ~* '\mauth\.users\M'

  UNION ALL

  -- 5. RLS enabled but no policy: not an exposure (deny-by-default), but almost
  --    always a mistake — the table is unreachable by anon/authenticated.
  SELECT 'WARN',
         'rls_enabled_no_policy',
         format('%I.%I', n.nspname, c.relname),
         'RLS is enabled but no policy is defined — table is inaccessible to API roles'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = n.nspname AND p.tablename = c.relname
    )

  UNION ALL

  -- 6. Function with a mutable search_path: opens a search_path-injection vector,
  --    especially for SECURITY DEFINER functions. Pin it with SET search_path.
  SELECT 'WARN',
         'function_search_path_mutable',
         format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
         CASE WHEN p.prosecdef THEN 'SECURITY DEFINER function' ELSE 'function' END
           || ' does not pin search_path — add "SET search_path = ..."'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) AS cfg
      WHERE cfg LIKE 'search_path=%'
    )

  UNION ALL

  -- 7. Extension installed in the public schema: prefer a dedicated schema so
  --    its objects don't crowd (or shadow names in) the API surface.
  SELECT 'WARN',
         'extension_in_public',
         e.extname,
         'extension installed in the public schema — prefer a dedicated schema (e.g. extensions)'
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE n.nspname = 'public'
    AND e.extname NOT IN ('plpgsql')  -- plpgsql lives in public by design

)
SELECT severity, lint, object, detail
FROM findings
ORDER BY (severity = 'ERROR') DESC, lint, object;
