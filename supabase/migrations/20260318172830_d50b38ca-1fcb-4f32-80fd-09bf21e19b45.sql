
UPDATE ad_network_policies SET display_fill_rate = 0.90, video_fill_rate = 0.10, updated_at = now()
WHERE network_name = 'Google AdSense';

UPDATE ad_network_policies SET display_fill_rate = 0.90, video_fill_rate = 0.10, updated_at = now()
WHERE network_name = 'Ezoic' AND tier_name = 'Business';

UPDATE ad_network_policies SET display_fill_rate = 0.88, video_fill_rate = 0.12, updated_at = now()
WHERE network_name = 'Ezoic' AND tier_name = 'VIP & Enterprise';

UPDATE ad_network_policies SET display_fill_rate = 0.85, video_fill_rate = 0.15, updated_at = now()
WHERE network_name = 'Mediavine';

UPDATE ad_network_policies SET display_fill_rate = 0.85, video_fill_rate = 0.15, updated_at = now()
WHERE network_name = 'Raptive';
