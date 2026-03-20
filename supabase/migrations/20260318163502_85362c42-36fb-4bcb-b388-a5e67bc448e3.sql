-- Update Ezoic tiers to match their actual pricing page
-- Remove the incorrect "Access Now" and "Level 1/2" tiers
DELETE FROM ad_network_policies WHERE network_name = 'Ezoic';

-- Insert correct Ezoic tiers based on their actual pricing page
INSERT INTO ad_network_policies (network_name, tier_name, display_cpm, video_cpm, display_fill_rate, video_fill_rate, refresh_interval_seconds, revenue_share_percent, min_monthly_pageviews, min_requirements_notes)
VALUES
  ('Ezoic', 'Growth', 3.00, 12.00, 0.85, 0.15, 30, 90, 0, 'Self-serve. AI-optimized ad placements. No minimum traffic requirement.'),
  ('Ezoic', 'Business', 5.00, 18.00, 0.90, 0.20, 30, 90, 250000, '250K+ monthly users. Dedicated onboarding, account specialist, strategic management.'),
  ('Ezoic', 'VIP & Enterprise', 7.00, 22.00, 0.95, 0.25, 30, 90, 1000000, '1M+ monthly users. Dedicated strategy team, 24/7 support, custom integration.');