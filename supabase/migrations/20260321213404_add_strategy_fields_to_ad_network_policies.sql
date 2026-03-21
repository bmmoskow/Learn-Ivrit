/*
  # Add Strategy Fields to ad_network_policies
  
  1. Schema Changes
    - Add `strategy_name` (text, not null) - Name of the ad placement strategy
    - Add `strategy_description` (text, nullable) - Detailed description for tooltip
    - Add `ad_slots_per_page` (numeric, default 1) - Number of ad units per page
    - Add `viewability_rate` (numeric, default 0.7) - Percentage of ads that are viewable (0.0 to 1.0)
    - Add `engagement_factor` (numeric, default 1.0) - User engagement multiplier
    - Add `policy_compliance_factor` (numeric, default 1.0) - Policy compliance multiplier
    - Drop UNIQUE constraint on (network_name, tier_name)
    - Add UNIQUE constraint on (network_name, tier_name, strategy_name)
  
  2. Data Migration
    - Update existing rows to have a default strategy_name of "Standard"
  
  3. Constraints
    - Add check constraints for new rate fields
*/

-- Add new strategy columns
ALTER TABLE ad_network_policies
  ADD COLUMN IF NOT EXISTS strategy_name text,
  ADD COLUMN IF NOT EXISTS strategy_description text,
  ADD COLUMN IF NOT EXISTS ad_slots_per_page numeric(4, 2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS viewability_rate numeric(4, 3) DEFAULT 0.70,
  ADD COLUMN IF NOT EXISTS engagement_factor numeric(4, 2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS policy_compliance_factor numeric(4, 2) DEFAULT 1.0;

-- Update existing rows to have a default strategy name
UPDATE ad_network_policies
SET strategy_name = 'Standard'
WHERE strategy_name IS NULL;

-- Make strategy_name required
ALTER TABLE ad_network_policies
  ALTER COLUMN strategy_name SET NOT NULL;

-- Drop old unique constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ad_network_policies_network_name_tier_name_key'
  ) THEN
    ALTER TABLE ad_network_policies 
      DROP CONSTRAINT ad_network_policies_network_name_tier_name_key;
  END IF;
END $$;

-- Add new unique constraint including strategy_name
ALTER TABLE ad_network_policies
  ADD CONSTRAINT ad_network_policies_unique_strategy 
    UNIQUE(network_name, tier_name, strategy_name);

-- Add check constraints for new fields
ALTER TABLE ad_network_policies
  DROP CONSTRAINT IF EXISTS check_viewability_rate,
  DROP CONSTRAINT IF EXISTS check_ad_slots_positive,
  DROP CONSTRAINT IF EXISTS check_engagement_factor_positive,
  DROP CONSTRAINT IF EXISTS check_policy_compliance_positive;

ALTER TABLE ad_network_policies
  ADD CONSTRAINT check_viewability_rate CHECK (viewability_rate >= 0 AND viewability_rate <= 1),
  ADD CONSTRAINT check_ad_slots_positive CHECK (ad_slots_per_page > 0),
  ADD CONSTRAINT check_engagement_factor_positive CHECK (engagement_factor >= 0),
  ADD CONSTRAINT check_policy_compliance_positive CHECK (policy_compliance_factor >= 0 AND policy_compliance_factor <= 1);

-- Create index for efficient querying by strategy
CREATE INDEX IF NOT EXISTS idx_ad_network_policies_full 
  ON ad_network_policies(network_name, tier_name, strategy_name);
