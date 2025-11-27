/*
  # Gemini API Rate Limiting System

  1. New Tables
    - `gemini_api_rate_limits`
      - `id` (uuid, primary key) - Unique identifier for each request log
      - `user_id` (uuid, foreign key) - References auth.users, the user making the request
      - `request_type` (text) - Type of request: 'word_definition' or 'passage_translation'
      - `created_at` (timestamptz) - Timestamp of the request for time-window tracking
      - `updated_at` (timestamptz) - Auto-updated timestamp

  2. Security
    - Enable RLS on `gemini_api_rate_limits` table
    - Users can only insert their own rate limit records
    - No read, update, or delete permissions (system manages cleanup)

  3. Performance
    - Composite index on (user_id, request_type, created_at) for fast rate limit queries
    - Check constraint to ensure valid request types

  4. Cleanup & Maintenance
    - Automatic cleanup function to remove records older than 24 hours
    - Scheduled background job runs cleanup every hour via pg_cron
    - Keeps table size manageable and removes expired tracking data

  5. Rate Limit Configuration
    - Word definitions: 100/hour, 500/day
    - Passage translations: 30/hour, 100/day
    - Limits enforced in edge functions before making Gemini API calls
*/

-- Create gemini_api_rate_limits table
CREATE TABLE IF NOT EXISTS gemini_api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('word_definition', 'passage_translation')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE gemini_api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own rate limit records
CREATE POLICY "Users can log own API requests"
  ON gemini_api_rate_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create composite index for fast rate limit queries
CREATE INDEX IF NOT EXISTS idx_gemini_rate_limits_user_type_time 
  ON gemini_api_rate_limits(user_id, request_type, created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_gemini_api_rate_limits_updated_at
  BEFORE UPDATE ON gemini_api_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function: Remove records older than 24 hours
CREATE OR REPLACE FUNCTION cleanup_gemini_api_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.gemini_api_rate_limits
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Schedule cleanup to run every hour
SELECT cron.schedule(
  'cleanup-gemini-rate-limits',
  '0 * * * *',
  $$SELECT cleanup_gemini_api_rate_limits()$$
);