-- Seed data for ad_network_policies table
-- Run this manually on your Supabase instance after applying all migrations

INSERT INTO ad_network_policies (network_name, min_page_views, max_page_views, estimated_rpm_usd, notes, serving_strategy, fallback_network) VALUES
-- Google AdSense strategies
('Google AdSense', 0, 999, 2.50, 'Low traffic tier - basic monetization for new sites', 'primary', NULL),
('Google AdSense', 1000, 9999, 4.00, 'Growing traffic tier - improved ad targeting begins', 'primary', NULL),
('Google AdSense', 10000, 49999, 6.50, 'Established site tier - better ad inventory access', 'primary', NULL),
('Google AdSense', 50000, 199999, 9.00, 'High traffic tier - premium advertiser access', 'primary', NULL),
('Google AdSense', 200000, NULL, 12.00, 'Enterprise tier - maximum revenue optimization', 'primary', NULL),

-- Ezoic strategies
('Ezoic', 10000, 49999, 8.00, 'Ezoic minimum threshold - AI-driven ad optimization', 'primary', 'Google AdSense'),
('Ezoic', 50000, 199999, 12.50, 'Ezoic mid-tier - advanced layout testing', 'primary', 'Google AdSense'),
('Ezoic', 200000, NULL, 18.00, 'Ezoic premium tier - dedicated account management', 'primary', 'Google AdSense'),

-- Mediavine strategies
('Mediavine', 50000, 199999, 15.00, 'Mediavine entry tier - premium ad network', 'primary', 'Ezoic'),
('Mediavine', 200000, NULL, 22.00, 'Mediavine established tier - top-tier revenue', 'primary', 'Ezoic'),

-- AdThrive strategies
('AdThrive', 100000, 499999, 18.00, 'AdThrive minimum - elite publisher network', 'primary', 'Mediavine'),
('AdThrive', 500000, NULL, 25.00, 'AdThrive premium - maximum revenue potential', 'primary', 'Mediavine');
