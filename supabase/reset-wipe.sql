-- =====================================================================
-- reset-wipe.sql — drop every object in the public schema.
-- Used by reset-env.sh as step 1 of a full reset. The public schema
-- itself (and its Supabase role grants) is preserved; only its contents
-- are removed. All tables are dropped with CASCADE so dependent policies,
-- triggers, constraints, and views go with them.
--
-- SAFE to run on an empty schema (everything is IF EXISTS). NEVER run
-- against production — reset-env.sh enforces that guard.
-- =====================================================================
DO $$
DECLARE r RECORD;
BEGIN
  -- Tables (CASCADE drops dependent policies, triggers, constraints, views)
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
  -- Any remaining standalone views
  FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
  END LOOP;
  -- Functions and procedures
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f','p')
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
  -- Enum / composite types not backed by a table
  FOR r IN
    SELECT t.typname
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype IN ('e','c')
      AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.reltype = t.oid)
  LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
  END LOOP;
END $$;
