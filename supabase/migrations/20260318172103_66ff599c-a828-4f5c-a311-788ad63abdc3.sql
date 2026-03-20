
-- Add cpm_source_url column for CPM data sources (separate from rev share source)
ALTER TABLE ad_network_policies ADD COLUMN IF NOT EXISTS cpm_source_url text;

-- Update Google AdSense with official source and typical education-niche CPMs
UPDATE ad_network_policies SET
  display_cpm = 1.50,
  video_cpm = 4.00,
  display_fill_rate = 0.85,
  video_fill_rate = 0.10,
  revenue_share_percent = 68,
  source_url = 'https://support.google.com/adsense/answer/180195',
  cpm_source_url = 'https://monetizepros.com/display-advertising/display-ad-benchmarks/',
  min_monthly_pageviews = 0,
  min_requirements_notes = 'No minimum traffic. Publisher receives 80% sell-side share; ~68% net when Google Ads is the buyer.',
  updated_at = now()
WHERE network_name = 'Google AdSense' AND tier_name = 'Standard';

-- Update Ezoic Business
UPDATE ad_network_policies SET
  display_cpm = 5.00,
  video_cpm = 10.00,
  display_fill_rate = 0.90,
  video_fill_rate = 0.10,
  revenue_share_percent = 90,
  source_url = 'https://roihacks.com/ezoic-pricing/',
  cpm_source_url = 'https://adstimate.com/blog/adsense-vs-ezoic-vs-mediavine-2026.html',
  min_monthly_pageviews = 250000,
  min_requirements_notes = '250K+ monthly users. Dedicated onboarding, account specialist, Google AdX access.',
  updated_at = now()
WHERE network_name = 'Ezoic' AND tier_name = 'Business';

-- Update Ezoic VIP & Enterprise
UPDATE ad_network_policies SET
  display_cpm = 8.00,
  video_cpm = 15.00,
  display_fill_rate = 0.92,
  video_fill_rate = 0.12,
  revenue_share_percent = 90,
  source_url = 'https://roihacks.com/ezoic-pricing/',
  cpm_source_url = 'https://adstimate.com/blog/adsense-vs-ezoic-vs-mediavine-2026.html',
  min_monthly_pageviews = 1000000,
  min_requirements_notes = '1M+ monthly users. Dedicated strategy team, 24/7 support, custom integration.',
  updated_at = now()
WHERE network_name = 'Ezoic' AND tier_name = 'VIP & Enterprise';

-- Update Mediavine Official
UPDATE ad_network_policies SET
  display_cpm = 12.00,
  video_cpm = 20.00,
  display_fill_rate = 0.95,
  video_fill_rate = 0.15,
  revenue_share_percent = 75,
  source_url = 'https://help.mediavine.com/revenue-share',
  cpm_source_url = 'https://adstimate.com/blog/adsense-vs-ezoic-vs-mediavine-2026.html',
  min_monthly_pageviews = 50000,
  min_requirements_notes = 'Requires 50,000+ monthly sessions. Publishers earning <$100,000/year.',
  updated_at = now()
WHERE network_name = 'Mediavine' AND tier_name = 'Official';

-- Update Mediavine Select
UPDATE ad_network_policies SET
  display_cpm = 14.00,
  video_cpm = 22.00,
  display_fill_rate = 0.95,
  video_fill_rate = 0.15,
  revenue_share_percent = 80,
  source_url = 'https://help.mediavine.com/revenue-share',
  cpm_source_url = 'https://adstimate.com/blog/adsense-vs-ezoic-vs-mediavine-2026.html',
  min_monthly_pageviews = 50000,
  min_requirements_notes = 'Publishers earning $100,000–$249,999/year.',
  updated_at = now()
WHERE network_name = 'Mediavine' AND tier_name = 'Select';

-- Update Mediavine Signature
UPDATE ad_network_policies SET
  display_cpm = 16.00,
  video_cpm = 25.00,
  display_fill_rate = 0.95,
  video_fill_rate = 0.15,
  revenue_share_percent = 85,
  source_url = 'https://help.mediavine.com/revenue-share',
  cpm_source_url = 'https://adstimate.com/blog/adsense-vs-ezoic-vs-mediavine-2026.html',
  min_monthly_pageviews = 50000,
  min_requirements_notes = 'Publishers earning $250,000–$499,999/year.',
  updated_at = now()
WHERE network_name = 'Mediavine' AND tier_name = 'Signature';

-- Update Mediavine Premiere
UPDATE ad_network_policies SET
  display_cpm = 18.00,
  video_cpm = 28.00,
  display_fill_rate = 0.95,
  video_fill_rate = 0.15,
  revenue_share_percent = 90,
  source_url = 'https://help.mediavine.com/revenue-share',
  cpm_source_url = 'https://adstimate.com/blog/adsense-vs-ezoic-vs-mediavine-2026.html',
  min_monthly_pageviews = 50000,
  min_requirements_notes = 'Publishers earning $500,000–$999,999/year.',
  updated_at = now()
WHERE network_name = 'Mediavine' AND tier_name = 'Premiere';

-- Update Mediavine Premiere Plus
UPDATE ad_network_policies SET
  display_cpm = 20.00,
  video_cpm = 30.00,
  display_fill_rate = 0.95,
  video_fill_rate = 0.15,
  revenue_share_percent = 90,
  source_url = 'https://help.mediavine.com/revenue-share',
  cpm_source_url = 'https://adstimate.com/blog/adsense-vs-ezoic-vs-mediavine-2026.html',
  min_monthly_pageviews = 50000,
  min_requirements_notes = 'Publishers earning $1,000,000+/year.',
  updated_at = now()
WHERE network_name = 'Mediavine' AND tier_name = 'Premiere Plus';

-- Add Raptive (was removed in a previous revert)
INSERT INTO ad_network_policies (
  network_name, tier_name, display_cpm, video_cpm,
  display_fill_rate, video_fill_rate, refresh_interval_seconds,
  revenue_share_percent, min_monthly_pageviews,
  source_url, cpm_source_url, min_requirements_notes
) VALUES (
  'Raptive', 'Standard', 15.00, 25.00,
  0.95, 0.15, 30,
  75, 25000,
  'https://help.raptive.com/hc/en-us/articles/360032840891',
  'https://adstimate.com/blog/adsense-vs-ezoic-vs-mediavine-2026.html',
  'Requires 25,000+ pageviews/month. Domain 6+ months old. Revenue share not publicly disclosed; 75% is an industry estimate.'
);
