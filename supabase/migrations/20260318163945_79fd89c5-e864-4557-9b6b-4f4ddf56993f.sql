-- Remove all Ezoic tiers and re-insert only Business and VIP & Enterprise
DELETE FROM ad_network_policies WHERE network_name = 'Ezoic';

INSERT INTO ad_network_policies (network_name, tier_name, display_cpm, video_cpm, display_fill_rate, video_fill_rate, refresh_interval_seconds, revenue_share_percent, min_monthly_pageviews, min_requirements_notes)
VALUES
  ('Ezoic', 'Business', 5.00, 18.00, 0.90, 0.20, 30, 90, 250000, '250K+ monthly users. Dedicated onboarding, account specialist, strategic management. Google AdX access.'),
  ('Ezoic', 'VIP & Enterprise', 7.00, 22.00, 0.95, 0.25, 30, 90, 1000000, '1M+ monthly users. Dedicated strategy team, 24/7 support, custom integration.');