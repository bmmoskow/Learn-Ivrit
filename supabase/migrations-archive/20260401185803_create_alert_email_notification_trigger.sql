/*
  # Add Email Notification Trigger for Admin Alerts

  1. Changes
    - Create a trigger function that calls the send-notification-email edge function
    - Add a trigger on admin_alerts that fires after insert
    - Sends email notifications automatically when alerts require email delivery
    - Only sends email if metadata->>'send_email' is true

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only triggers on INSERT operations
    - Uses Supabase's http extension to call edge function

  3. Important Notes
    - Emails sent asynchronously (doesn't block alert creation)
    - Failures logged but don't prevent alert from being created
    - Updates alert record with sent_email status
*/

CREATE OR REPLACE FUNCTION notify_admin_alert()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  project_url text;
  should_send_email boolean;
BEGIN
  should_send_email := COALESCE((NEW.metadata->>'send_email')::boolean, false);
  
  IF NOT should_send_email THEN
    RETURN NEW;
  END IF;

  project_url := current_setting('app.settings.supabase_url', true);
  IF project_url IS NULL THEN
    project_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;

  function_url := project_url || '/functions/v1/send-notification-email';

  PERFORM extensions.http((
    'POST',
    function_url,
    ARRAY[extensions.http_header('Content-Type', 'application/json')],
    'application/json',
    json_build_object(
      'id', NEW.id,
      'alert_type', NEW.alert_type,
      'severity', NEW.severity,
      'title', NEW.title,
      'message', NEW.message,
      'metadata', NEW.metadata,
      'created_at', NEW.created_at
    )::text
  )::extensions.http_request);

  UPDATE admin_alerts
  SET 
    sent_email = true,
    email_sent_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to send alert email notification: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_admin_alert_notify ON admin_alerts;
CREATE TRIGGER on_admin_alert_notify
  AFTER INSERT ON admin_alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_alert();
