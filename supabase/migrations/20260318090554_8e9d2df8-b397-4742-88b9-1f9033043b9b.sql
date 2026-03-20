
-- Anonymous daily page view aggregates for ad revenue estimation
CREATE TABLE public.page_views_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  view_date date NOT NULL DEFAULT CURRENT_DATE,
  view_count integer NOT NULL DEFAULT 1,
  total_active_seconds integer NOT NULL DEFAULT 0,
  UNIQUE(page, view_date)
);

ALTER TABLE public.page_views_daily ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (for admin dashboard)
CREATE POLICY "Admins can view page analytics"
  ON public.page_views_daily FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role manages all operations
CREATE POLICY "Service role manages page views"
  ON public.page_views_daily FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RPC function to upsert page view data (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.log_page_view(p_page text, p_active_seconds integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO page_views_daily (page, view_date, view_count, total_active_seconds)
  VALUES (p_page, CURRENT_DATE, 1, p_active_seconds)
  ON CONFLICT (page, view_date)
  DO UPDATE SET
    view_count = page_views_daily.view_count + 1,
    total_active_seconds = page_views_daily.total_active_seconds + EXCLUDED.total_active_seconds;
END;
$$;
