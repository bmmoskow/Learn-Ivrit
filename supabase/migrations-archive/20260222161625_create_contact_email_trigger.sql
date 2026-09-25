/*
  # Add Email Notification Trigger for Contact Submissions

  1. Changes
    - Create a trigger function that calls the send-contact-email edge function
    - Add a trigger on contact_submissions that fires after insert
    - Sends email notifications automatically when users submit the contact form

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only triggers on INSERT operations
    - Uses Supabase's http extension to call edge function
*/

-- Enable the http extension if not already enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create function to send contact email notification
CREATE OR REPLACE FUNCTION notify_contact_submission()
RETURNS TRIGGER AS $$
DECLARE
  function_url text;
  service_role_key text;
  project_url text;
BEGIN
  -- Get project URL from environment
  project_url := current_setting('app.settings.supabase_url', true);
  IF project_url IS NULL THEN
    project_url := 'https://' || current_setting('request.headers', true)::json->>'host';
  END IF;

  -- Construct edge function URL
  function_url := project_url || '/functions/v1/send-contact-email';

  -- Get service role key from vault if available, otherwise skip
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    service_role_key := NULL;
  END;

  -- Call edge function asynchronously (don't wait for response)
  PERFORM extensions.http((
    'POST',
    function_url,
    ARRAY[extensions.http_header('Content-Type', 'application/json')],
    'application/json',
    json_build_object(
      'id', NEW.id,
      'user_id', NEW.user_id,
      'name', NEW.name,
      'email', NEW.email,
      'message_type', NEW.message_type,
      'message', NEW.message,
      'created_at', NEW.created_at
    )::text
  )::extensions.http_request);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the insert
  RAISE WARNING 'Failed to send contact email notification: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_contact_submission_notify ON contact_submissions;
CREATE TRIGGER on_contact_submission_notify
  AFTER INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_contact_submission();
