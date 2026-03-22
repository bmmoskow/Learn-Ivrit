/*
  # Create Ad Configuration Table

  1. New Tables
    - `ad_config`
      - `id` (uuid, primary key) - Unique identifier for the configuration
      - `created_at` (timestamptz) - When the configuration was created
      - `updated_at` (timestamptz) - When the configuration was last updated
      - `config` (jsonb) - JSON configuration for ad networks
      - `version` (integer) - Version number for configuration tracking
      - `is_active` (boolean) - Whether this configuration is currently active

  2. Security
    - Enable RLS on `ad_config` table
    - Add policy for admins to read configuration
    - Add policy for admins to insert/update configuration

  3. Notes
    - Only one active configuration should exist at a time
    - Configuration is stored as JSONB for flexibility
    - Admins can manage ad configurations
*/

-- Drop old table if exists
DROP TABLE IF EXISTS ad_network_policies CASCADE;

-- Create new ad_config table
CREATE TABLE IF NOT EXISTS ad_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true
);

-- Add check constraint to ensure only one active config
CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_config_single_active 
  ON ad_config (is_active) 
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE ad_config ENABLE ROW LEVEL SECURITY;

-- Admin read policy
CREATE POLICY "Admins can read ad config"
  ON ad_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin insert policy
CREATE POLICY "Admins can insert ad config"
  ON ad_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin update policy
CREATE POLICY "Admins can update ad config"
  ON ad_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admin delete policy
CREATE POLICY "Admins can delete ad config"
  ON ad_config
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ad_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ad_config_updated_at
  BEFORE UPDATE ON ad_config
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_config_updated_at();
