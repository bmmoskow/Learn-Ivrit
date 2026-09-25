/*
  # Create Spend Monitoring Trigger Functions

  1. Functions Created
    - `calculate_monthly_spend()` - Calculates total spend for current month
    - `check_spend_thresholds()` - Checks if any alert thresholds crossed
    - `create_spend_alert()` - Creates alert records and triggers emails
    - `monitor_api_usage()` - Trigger function that runs after API usage logs

  2. Trigger Created
    - `after_api_usage_monitor_spend` - Runs after each api_usage_logs insert

  3. Behavior
    - Automatically updates monthly_spend_tracking after each API call
    - Creates alerts when crossing 50%, 80%, 95% thresholds
    - Activates circuit breaker at 95% to prevent service suspension
    - Only creates one alert per threshold (prevents spam)

  4. Security
    - Functions run with SECURITY DEFINER to bypass RLS
    - Only triggered by INSERT on api_usage_logs
*/

-- Function to calculate current month's total spend
CREATE OR REPLACE FUNCTION calculate_monthly_spend()
RETURNS NUMERIC AS $$
DECLARE
  current_month DATE;
  total NUMERIC;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  SELECT COALESCE(SUM(cost), 0)
  INTO total
  FROM api_usage_logs
  WHERE DATE_TRUNC('month', created_at)::DATE = current_month;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if threshold alerts need to be created
CREATE OR REPLACE FUNCTION check_spend_thresholds(
  current_spend NUMERIC,
  spend_cap NUMERIC
)
RETURNS TABLE(
  threshold_percent NUMERIC,
  severity TEXT,
  send_email BOOLEAN,
  activate_circuit_breaker BOOLEAN
) AS $$
DECLARE
  spend_percent NUMERIC;
  current_month DATE;
BEGIN
  spend_percent := (current_spend / NULLIF(spend_cap, 0)) * 100;
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  RETURN QUERY
  SELECT 
    t.threshold_percent,
    t.severity,
    t.send_email,
    t.activate_circuit_breaker
  FROM alert_thresholds t
  WHERE t.enabled = true
    AND spend_percent >= t.threshold_percent
    AND NOT EXISTS (
      SELECT 1 FROM admin_alerts a
      WHERE a.alert_type = 'spend_cap_warning'
        AND (a.metadata->>'threshold_percent')::NUMERIC = t.threshold_percent
        AND (a.metadata->>'month')::DATE = current_month
    )
  ORDER BY t.threshold_percent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create spend alert
CREATE OR REPLACE FUNCTION create_spend_alert(
  p_threshold_percent NUMERIC,
  p_severity TEXT,
  p_send_email BOOLEAN,
  p_current_spend NUMERIC,
  p_spend_cap NUMERIC,
  p_current_tier TEXT
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
  spend_percent NUMERIC;
  remaining NUMERIC;
  current_month DATE;
  alert_title TEXT;
  alert_message TEXT;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  spend_percent := ROUND((p_current_spend / NULLIF(p_spend_cap, 0)) * 100, 1);
  remaining := p_spend_cap - p_current_spend;
  
  -- Build alert title and message based on threshold
  IF p_threshold_percent = 50 THEN
    alert_title := 'Monthly Spend Checkpoint';
    alert_message := format(
      'You''ve used %s%% of your %s monthly budget ($%s / $%s). Current pace: Monitor usage to avoid service interruption.',
      spend_percent, p_current_tier, ROUND(p_current_spend, 2), p_spend_cap
    );
  ELSIF p_threshold_percent = 80 THEN
    alert_title := 'Approaching Spend Limit';
    alert_message := format(
      'You''ve used %s%% of your %s monthly budget ($%s / $%s). Action required: Monitor usage closely. Only $%s remaining. Service will suspend when cap is reached.',
      spend_percent, p_current_tier, ROUND(p_current_spend, 2), p_spend_cap, ROUND(remaining, 2)
    );
  ELSIF p_threshold_percent >= 95 THEN
    alert_title := 'CRITICAL: Spend Limit Nearly Reached';
    alert_message := format(
      'You''ve used %s%% of your %s monthly budget ($%s / $%s). Circuit breaker activated: Gemini API calls are now blocked to prevent overage charges. You have $%s remaining. Service suspends at $%s.',
      spend_percent, p_current_tier, ROUND(p_current_spend, 2), p_spend_cap, ROUND(remaining, 2), p_spend_cap
    );
  ELSE
    alert_title := format('Spend Alert: %s%%', p_threshold_percent);
    alert_message := format(
      'You''ve used %s%% of your %s monthly budget ($%s / $%s).',
      spend_percent, p_current_tier, ROUND(p_current_spend, 2), p_spend_cap
    );
  END IF;
  
  -- Create alert record
  INSERT INTO admin_alerts (
    alert_type,
    severity,
    title,
    message,
    metadata,
    sent_email
  ) VALUES (
    'spend_cap_warning',
    p_severity,
    alert_title,
    alert_message,
    jsonb_build_object(
      'threshold_percent', p_threshold_percent,
      'current_spend', p_current_spend,
      'spend_cap', p_spend_cap,
      'spend_percent', spend_percent,
      'remaining', remaining,
      'current_tier', p_current_tier,
      'month', current_month,
      'send_email', p_send_email
    ),
    false
  )
  RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Main trigger function to monitor API usage and update spend tracking
CREATE OR REPLACE FUNCTION monitor_api_usage()
RETURNS TRIGGER AS $$
DECLARE
  current_month DATE;
  total_spend NUMERIC;
  current_cap NUMERIC;
  current_tier TEXT;
  api_status BOOLEAN;
  threshold_record RECORD;
  alert_id UUID;
  should_activate_breaker BOOLEAN;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Calculate current month's total spend
  total_spend := calculate_monthly_spend();
  
  -- Get or create monthly tracking record
  INSERT INTO monthly_spend_tracking (month, total_spend)
  VALUES (current_month, total_spend)
  ON CONFLICT (month) DO UPDATE
  SET 
    total_spend = total_spend,
    last_updated = now()
  RETURNING spend_cap, current_tier, api_enabled
  INTO current_cap, current_tier, api_status;
  
  -- Check for threshold crossings
  should_activate_breaker := false;
  
  FOR threshold_record IN 
    SELECT * FROM check_spend_thresholds(total_spend, current_cap)
  LOOP
    -- Create alert for this threshold
    alert_id := create_spend_alert(
      threshold_record.threshold_percent,
      threshold_record.severity,
      threshold_record.send_email,
      total_spend,
      current_cap,
      current_tier
    );
    
    -- Check if we need to activate circuit breaker
    IF threshold_record.activate_circuit_breaker THEN
      should_activate_breaker := true;
    END IF;
  END LOOP;
  
  -- Activate circuit breaker if needed
  IF should_activate_breaker AND api_status = true THEN
    UPDATE monthly_spend_tracking
    SET 
      api_enabled = false,
      circuit_breaker_activated_at = now(),
      last_updated = now()
    WHERE month = current_month;
    
    -- Create circuit breaker activation alert
    INSERT INTO admin_alerts (
      alert_type,
      severity,
      title,
      message,
      metadata
    ) VALUES (
      'circuit_breaker_activated',
      'critical',
      'Circuit Breaker Activated',
      format(
        'Gemini API calls have been automatically disabled to prevent service suspension. Current spend: $%s / $%s (95%% threshold reached). Users will see a graceful degradation message instead of API errors.',
        ROUND(total_spend, 2), current_cap
      ),
      jsonb_build_object(
        'current_spend', total_spend,
        'spend_cap', current_cap,
        'current_tier', current_tier,
        'month', current_month,
        'activated_at', now()
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to monitor API usage: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on api_usage_logs
DROP TRIGGER IF EXISTS after_api_usage_monitor_spend ON api_usage_logs;
CREATE TRIGGER after_api_usage_monitor_spend
  AFTER INSERT ON api_usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION monitor_api_usage();
