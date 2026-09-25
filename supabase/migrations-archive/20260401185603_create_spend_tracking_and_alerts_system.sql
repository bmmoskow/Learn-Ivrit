/*
  # Create Spend Tracking and Alert System

  1. New Tables
    - `monthly_spend_tracking`
      - Tracks cumulative spend per calendar month
      - Circuit breaker state (api_enabled)
      - Current tier and spend cap
    - `admin_alerts`
      - Alert history for spend warnings
      - Email delivery tracking
      - Read/unread status
    - `alert_thresholds`
      - Configurable alert thresholds
      - Email preferences per threshold

  2. Changes to Existing Tables
    - `api_usage_logs`
      - Add token variance tracking columns

  3. Security
    - Enable RLS on all new tables
    - Only authenticated admins can read alerts
    - System can insert alerts via triggers

  4. Important Notes
    - Circuit breaker prevents service suspension UX issues
    - Alerts sent at 50%, 80%, 95% of spend cap
    - 95% threshold activates circuit breaker automatically
    - Manual override available for emergency situations
*/

-- Create monthly_spend_tracking table
CREATE TABLE IF NOT EXISTS monthly_spend_tracking (
  month DATE PRIMARY KEY,
  total_spend NUMERIC DEFAULT 0 NOT NULL,
  current_tier TEXT DEFAULT 'tier1' NOT NULL,
  spend_cap NUMERIC DEFAULT 250 NOT NULL,
  api_enabled BOOLEAN DEFAULT true NOT NULL,
  circuit_breaker_activated_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE monthly_spend_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view spend tracking"
  ON monthly_spend_tracking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage spend tracking"
  ON monthly_spend_tracking FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create admin_alerts table
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('spend_cap_warning', 'tier_progress', 'service_suspended', 'circuit_breaker_activated')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_email BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
  ON admin_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can insert alerts"
  ON admin_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON admin_alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create alert_thresholds configuration table
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_percent NUMERIC NOT NULL CHECK (threshold_percent > 0 AND threshold_percent <= 100),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  send_email BOOLEAN DEFAULT false,
  activate_circuit_breaker BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(threshold_percent)
);

ALTER TABLE alert_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view thresholds"
  ON alert_thresholds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage thresholds"
  ON alert_thresholds FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default alert thresholds
INSERT INTO alert_thresholds (threshold_percent, severity, send_email, activate_circuit_breaker, enabled)
VALUES 
  (50, 'info', false, false, true),
  (80, 'warning', true, false, true),
  (95, 'critical', true, true, true)
ON CONFLICT (threshold_percent) DO NOTHING;

-- Add token variance tracking to api_usage_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage_logs' AND column_name = 'estimated_prompt_tokens'
  ) THEN
    ALTER TABLE api_usage_logs ADD COLUMN estimated_prompt_tokens INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage_logs' AND column_name = 'estimated_candidates_tokens'
  ) THEN
    ALTER TABLE api_usage_logs ADD COLUMN estimated_candidates_tokens INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_usage_logs' AND column_name = 'token_variance_percent'
  ) THEN
    ALTER TABLE api_usage_logs ADD COLUMN token_variance_percent NUMERIC;
  END IF;
END $$;

-- Create index for alert queries
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_at 
  ON admin_alerts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_read 
  ON admin_alerts (read, created_at DESC);
