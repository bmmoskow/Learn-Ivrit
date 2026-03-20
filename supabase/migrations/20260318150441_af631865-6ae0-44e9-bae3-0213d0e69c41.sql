
-- Table to store ad network policies with all relevant monetization parameters
CREATE TABLE public.ad_network_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_name text NOT NULL,
  tier_name text NOT NULL,
  display_cpm numeric NOT NULL DEFAULT 0,
  video_cpm numeric NOT NULL DEFAULT 0,
  display_fill_rate numeric NOT NULL DEFAULT 0,
  video_fill_rate numeric NOT NULL DEFAULT 0,
  refresh_interval_seconds integer NOT NULL DEFAULT 30,
  revenue_share_percent numeric NOT NULL DEFAULT 100,
  min_monthly_pageviews integer NOT NULL DEFAULT 0,
  min_requirements_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network_name, tier_name)
);

ALTER TABLE public.ad_network_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ad network policies"
  ON public.ad_network_policies FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages ad network policies"
  ON public.ad_network_policies FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed with real-world ad network data
INSERT INTO public.ad_network_policies
  (network_name, tier_name, display_cpm, video_cpm, display_fill_rate, video_fill_rate, refresh_interval_seconds, revenue_share_percent, min_monthly_pageviews, min_requirements_notes)
VALUES
  ('Google AdSense', 'Standard', 1.50, 4.00, 0.85, 0.15, 30, 68, 0, 'No minimum traffic. Must comply with AdSense Program Policies. Site review required.'),
  ('Ezoic', 'Access Now', 3.00, 8.00, 0.80, 0.20, 30, 78, 0, 'No minimum pageviews. AI-driven ad placement optimization. Free CDN included.'),
  ('Ezoic', 'Level 1', 5.00, 12.00, 0.85, 0.22, 30, 80, 10000, '10k+ monthly visits. Better ad partner access. Priority support.'),
  ('Ezoic', 'Level 2', 7.00, 15.00, 0.88, 0.25, 30, 82, 50000, '50k+ monthly visits. Premium ad partners. Dedicated account rep.'),
  ('Mediavine', 'Standard', 12.00, 25.00, 0.92, 0.28, 30, 75, 50000, '50k+ sessions/month required. Must have original, long-form content. Exclusive contract.'),
  ('Mediavine', 'Pro', 15.00, 30.00, 0.94, 0.30, 30, 80, 100000, '100k+ sessions/month. Higher revenue share. Priority ad demand.'),
  ('Mediavine', 'Premium', 18.00, 35.00, 0.95, 0.30, 30, 85, 250000, '250k+ sessions/month. Top-tier advertisers. Custom ad solutions.'),
  ('Raptive', 'Standard', 15.00, 30.00, 0.93, 0.28, 30, 75, 100000, '100k+ pageviews/month. Must have majority US traffic. Quality content review.'),
  ('Raptive', 'Premium', 20.00, 40.00, 0.95, 0.30, 30, 80, 500000, '500k+ pageviews/month. Dedicated strategist. Premium ad demand.'),
  ('Publift', 'Starter', 5.00, 10.00, 0.82, 0.18, 30, 70, 500000, '$2k+/month ad revenue or 500k+ pageviews. Header bidding via Fuse platform.'),
  ('Publift', 'Growth', 8.00, 15.00, 0.88, 0.22, 30, 75, 2000000, '2M+ pageviews/month. Advanced yield optimization. Custom integrations.');
