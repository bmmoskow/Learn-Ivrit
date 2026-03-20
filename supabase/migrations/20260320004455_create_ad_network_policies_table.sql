/*
  # Create ad_network_policies table

  1. New Tables
    - `ad_network_policies`
      - `id` (uuid, primary key) - Unique identifier
      - `network_name` (text, not null) - Name of the ad network (e.g., "Google AdSense", "Ezoic")
      - `tier_name` (text, not null) - Tier level (e.g., "Standard", "Premium")
      - `display_cpm` (numeric, not null) - CPM rate for display ads in dollars
      - `video_cpm` (numeric, not null) - CPM rate for video ads in dollars
      - `display_fill_rate` (numeric, not null) - Fill rate for display ads (0.0 to 1.0)
      - `video_fill_rate` (numeric, not null) - Fill rate for video ads (0.0 to 1.0)
      - `refresh_interval_seconds` (integer, not null) - Ad refresh interval in seconds
      - `revenue_share_percent` (numeric, not null) - Publisher revenue share percentage
      - `min_monthly_pageviews` (integer, default 0) - Minimum monthly pageviews required
      - `min_requirements_notes` (text, nullable) - Additional requirements notes
      - `source_url` (text, nullable) - Source URL for network information
      - `cpm_source_url` (text, nullable) - Source URL for CPM data
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Indexes
    - Index on network_name for filtering
    - Composite index on (network_name, tier_name) for sorting

  3. Security
    - Enable RLS on `ad_network_policies` table
    - Add policy for authenticated users to read all policies
    - Add policy for authenticated users to insert policies
    - Add policy for authenticated users to update policies
    - Add policy for authenticated users to delete policies

  4. Constraints
    - Check constraints to ensure valid percentage and rate values
*/

CREATE TABLE IF NOT EXISTS ad_network_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_name text NOT NULL,
  tier_name text NOT NULL,
  display_cpm numeric(10, 2) NOT NULL,
  video_cpm numeric(10, 2) NOT NULL,
  display_fill_rate numeric(4, 3) NOT NULL,
  video_fill_rate numeric(4, 3) NOT NULL,
  refresh_interval_seconds integer NOT NULL,
  revenue_share_percent numeric(5, 2) NOT NULL,
  min_monthly_pageviews integer DEFAULT 0 NOT NULL,
  min_requirements_notes text,
  source_url text,
  cpm_source_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(network_name, tier_name)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ad_network_policies_network ON ad_network_policies(network_name);
CREATE INDEX IF NOT EXISTS idx_ad_network_policies_network_tier ON ad_network_policies(network_name, tier_name);

-- Add check constraints for data integrity
ALTER TABLE ad_network_policies
  ADD CONSTRAINT check_display_fill_rate CHECK (display_fill_rate >= 0 AND display_fill_rate <= 1),
  ADD CONSTRAINT check_video_fill_rate CHECK (video_fill_rate >= 0 AND video_fill_rate <= 1),
  ADD CONSTRAINT check_revenue_share CHECK (revenue_share_percent >= 0 AND revenue_share_percent <= 100),
  ADD CONSTRAINT check_cpm_positive CHECK (display_cpm >= 0 AND video_cpm >= 0),
  ADD CONSTRAINT check_refresh_interval_positive CHECK (refresh_interval_seconds > 0);

-- Enable Row Level Security
ALTER TABLE ad_network_policies ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all ad network policies
CREATE POLICY "Authenticated users can read ad policies"
  ON ad_network_policies
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert ad network policies
CREATE POLICY "Authenticated users can insert ad policies"
  ON ad_network_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update ad network policies
CREATE POLICY "Authenticated users can update ad policies"
  ON ad_network_policies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete ad network policies
CREATE POLICY "Authenticated users can delete ad policies"
  ON ad_network_policies
  FOR DELETE
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ad_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ad_network_policies_updated_at
  BEFORE UPDATE ON ad_network_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_ad_policies_updated_at();