/*
  # Fix ad_network_policies constraints

  ## Changes
  The table already has the correct schema (id, created_at, updated_at, config, version, is_active),
  but this migration ensures proper constraints and defaults are applied.

  1. Column Constraints
    - Make `version` NOT NULL with default value of 1
    - Make `is_active` NOT NULL with default value of false
    - Add check constraint: version >= 1

  2. Unique Constraints
    - Ensure only one config can be active at a time

  3. Indexes
    - Add index on is_active for efficient queries
    - Add GIN index on config JSONB for fast JSON queries
*/

-- Set default values for existing NULL records
UPDATE ad_network_policies 
SET version = 1 
WHERE version IS NULL;

UPDATE ad_network_policies 
SET is_active = false 
WHERE is_active IS NULL;

-- Make columns NOT NULL with defaults
ALTER TABLE ad_network_policies 
ALTER COLUMN version SET DEFAULT 1,
ALTER COLUMN version SET NOT NULL;

ALTER TABLE ad_network_policies 
ALTER COLUMN is_active SET DEFAULT false,
ALTER COLUMN is_active SET NOT NULL;

-- Add check constraint for version
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ad_network_policies_version_check'
  ) THEN
    ALTER TABLE ad_network_policies 
    ADD CONSTRAINT ad_network_policies_version_check CHECK (version >= 1);
  END IF;
END $$;

-- Ensure only one active config at a time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'ad_network_policies_single_active'
  ) THEN
    CREATE UNIQUE INDEX ad_network_policies_single_active 
    ON ad_network_policies (is_active) 
    WHERE is_active = true;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_network_policies_active 
ON ad_network_policies(is_active);

CREATE INDEX IF NOT EXISTS idx_ad_network_policies_config 
ON ad_network_policies USING GIN (config);

-- Add a comment to the table for documentation
COMMENT ON TABLE ad_network_policies IS 
'Stores ad network configuration policies with versioning support. Only one config can be active at a time.';

COMMENT ON COLUMN ad_network_policies.config IS 
'JSONB configuration containing all ad network policies and settings';

COMMENT ON COLUMN ad_network_policies.version IS 
'Version number for tracking configuration changes (must be >= 1)';

COMMENT ON COLUMN ad_network_policies.is_active IS 
'Indicates if this configuration is currently active (only one can be active)';
