/*
  # Create Contact Submissions Table

  1. New Tables
    - `contact_submissions`
      - `id` (uuid, primary key) - Unique identifier for each submission
      - `user_id` (uuid, nullable) - Links to auth.users if user is authenticated
      - `name` (text, required) - Submitter's name
      - `email` (text, required) - Submitter's email for follow-up
      - `message_type` (text, required) - Type of message: 'bug', 'feature', 'question', 'other'
      - `message` (text, required) - The actual message content
      - `status` (text, default 'new') - Tracking status: 'new', 'in_progress', 'resolved'
      - `created_at` (timestamptz) - When the submission was created
      - `updated_at` (timestamptz) - When the submission was last updated

  2. Security
    - Enable RLS on `contact_submissions` table
    - Allow both authenticated and anonymous users to submit (to help users with login issues)
    - Authenticated users can view their own submissions
    - Status updates restricted to admin (will need manual update via Supabase dashboard for now)

  3. Indexes
    - Index on user_id for fast lookups of user submissions
    - Index on status for filtering by status
    - Index on created_at for sorting by date
*/

-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('bug', 'feature', 'question', 'other')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON contact_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (authenticated or anonymous) to insert submissions
CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Authenticated users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_submissions_updated_at();