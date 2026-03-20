/*
  # Create page_views_daily table

  1. New Tables
    - `page_views_daily`
      - `id` (uuid, primary key) - Unique identifier for each record
      - `page` (text, not null) - Page identifier/URL
      - `view_date` (date, not null) - Date of the page views
      - `view_count` (integer, default 0) - Number of page views on that date
      - `total_active_seconds` (integer, default 0) - Total active time in seconds
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Indexes
    - Composite index on (page, view_date) for efficient querying
    - Index on view_date for date-based queries

  3. Security
    - Enable RLS on `page_views_daily` table
    - Add policy for authenticated users to read all data
    - Add policy for authenticated users to insert data
    - Add policy for authenticated users to update data

  4. Constraints
    - Unique constraint on (page, view_date) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS page_views_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  view_date date NOT NULL,
  view_count integer DEFAULT 0 NOT NULL,
  total_active_seconds integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(page, view_date)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_page_views_daily_page_date ON page_views_daily(page, view_date);
CREATE INDEX IF NOT EXISTS idx_page_views_daily_view_date ON page_views_daily(view_date);

-- Enable Row Level Security
ALTER TABLE page_views_daily ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all page view data
CREATE POLICY "Authenticated users can read page views"
  ON page_views_daily
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert page view data
CREATE POLICY "Authenticated users can insert page views"
  ON page_views_daily
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update page view data
CREATE POLICY "Authenticated users can update page views"
  ON page_views_daily
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_page_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER page_views_daily_updated_at
  BEFORE UPDATE ON page_views_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_page_views_updated_at();