/*
  # Simplify ad_network_policies to use JSONB configuration
  
  1. Schema Changes
    - Drop all individual policy columns
    - Add `config` (jsonb, not null) - Complete JSON configuration for ad network policies
    - Add `version` (integer, default 1) - Version number for configuration tracking
    - Keep `id`, `created_at`, `updated_at` for record management
    - Add `is_active` (boolean, default true) - Whether this configuration is currently active
  
  2. Migration Strategy
    - Collect all existing rows into a single JSONB policies array
    - Create one new row with all policies in config.policies
    - Drop old rows and columns after migration
    - Update indexes to work with JSONB
  
  3. Security
    - Read: All authenticated users
    - Write: All authenticated users (admin-only enforcement to be handled in app layer)
  
  4. Notes
    - Only one active configuration row should exist at a time
    - Historical versions can be kept for auditing
*/

-- Add new columns first
ALTER TABLE ad_network_policies
  ADD COLUMN IF NOT EXISTS config jsonb,
  ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- Remove NOT NULL constraints from old columns
ALTER TABLE ad_network_policies
  ALTER COLUMN network_name DROP NOT NULL,
  ALTER COLUMN tier_name DROP NOT NULL,
  ALTER COLUMN strategy_name DROP NOT NULL,
  ALTER COLUMN display_cpm DROP NOT NULL,
  ALTER COLUMN video_cpm DROP NOT NULL,
  ALTER COLUMN display_fill_rate DROP NOT NULL,
  ALTER COLUMN video_fill_rate DROP NOT NULL,
  ALTER COLUMN refresh_interval_seconds DROP NOT NULL,
  ALTER COLUMN revenue_share_percent DROP NOT NULL,
  ALTER COLUMN min_monthly_pageviews DROP NOT NULL;

-- Collect all existing policies into a single JSONB array and create new row
DO $$
DECLARE
  policies_json jsonb;
BEGIN
  -- Build JSONB array from all existing rows
  SELECT jsonb_agg(
    jsonb_build_object(
      'network_name', network_name,
      'tier_name', tier_name,
      'strategy_name', strategy_name,
      'strategy_description', strategy_description,
      'display_cpm', display_cpm,
      'video_cpm', video_cpm,
      'display_fill_rate', display_fill_rate,
      'video_fill_rate', video_fill_rate,
      'refresh_interval_seconds', refresh_interval_seconds,
      'revenue_share_percent', revenue_share_percent,
      'min_monthly_pageviews', min_monthly_pageviews,
      'min_requirements_notes', min_requirements_notes,
      'source_url', source_url,
      'cpm_source_url', cpm_source_url,
      'ad_slots_per_page', ad_slots_per_page,
      'viewability_rate', viewability_rate,
      'engagement_factor', engagement_factor,
      'policy_compliance_factor', policy_compliance_factor
    )
  ) INTO policies_json
  FROM ad_network_policies;

  -- Delete all existing rows
  DELETE FROM ad_network_policies;

  -- Insert single row with all policies
  IF policies_json IS NOT NULL THEN
    INSERT INTO ad_network_policies (id, config, version, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), jsonb_build_object('policies', policies_json), 1, true, now(), now());
  END IF;
END $$;

-- Now safe to drop old columns
ALTER TABLE ad_network_policies
  DROP COLUMN IF EXISTS network_name,
  DROP COLUMN IF EXISTS tier_name,
  DROP COLUMN IF EXISTS strategy_name,
  DROP COLUMN IF EXISTS strategy_description,
  DROP COLUMN IF EXISTS display_cpm,
  DROP COLUMN IF EXISTS video_cpm,
  DROP COLUMN IF EXISTS display_fill_rate,
  DROP COLUMN IF EXISTS video_fill_rate,
  DROP COLUMN IF EXISTS refresh_interval_seconds,
  DROP COLUMN IF EXISTS revenue_share_percent,
  DROP COLUMN IF EXISTS min_monthly_pageviews,
  DROP COLUMN IF EXISTS min_requirements_notes,
  DROP COLUMN IF EXISTS source_url,
  DROP COLUMN IF EXISTS cpm_source_url,
  DROP COLUMN IF EXISTS ad_slots_per_page,
  DROP COLUMN IF EXISTS viewability_rate,
  DROP COLUMN IF EXISTS engagement_factor,
  DROP COLUMN IF EXISTS policy_compliance_factor;

-- Make config required
ALTER TABLE ad_network_policies
  ALTER COLUMN config SET NOT NULL;

-- Drop old indexes and constraints
DROP INDEX IF EXISTS idx_ad_network_policies_network;
DROP INDEX IF EXISTS idx_ad_network_policies_network_tier;
DROP INDEX IF EXISTS idx_ad_network_policies_full;

-- Create index for active configuration lookup
CREATE INDEX IF NOT EXISTS idx_ad_network_policies_active ON ad_network_policies(is_active) WHERE is_active = true;

-- Create GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_ad_network_policies_config ON ad_network_policies USING gin(config);

-- Update RLS policies
DROP POLICY IF EXISTS "Authenticated users can read ad policies" ON ad_network_policies;
DROP POLICY IF EXISTS "Authenticated users can insert ad policies" ON ad_network_policies;
DROP POLICY IF EXISTS "Authenticated users can update ad policies" ON ad_network_policies;
DROP POLICY IF EXISTS "Authenticated users can delete ad policies" ON ad_network_policies;

-- All authenticated users can read (needed for revenue calculations)
CREATE POLICY "Authenticated users can read ad policies"
  ON ad_network_policies
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow inserts/updates/deletes for authenticated users
-- Note: Admin enforcement should be handled in application layer
CREATE POLICY "Authenticated users can insert ad policies"
  ON ad_network_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update ad policies"
  ON ad_network_policies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete ad policies"
  ON ad_network_policies
  FOR DELETE
  TO authenticated
  USING (true);