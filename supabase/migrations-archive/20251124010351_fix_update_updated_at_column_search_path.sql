/*
  # Fix search_path for update_updated_at_column function

  ## Security Fix
  - Set explicit search_path on update_updated_at_column function
  - This prevents potential security issues with trigger functions
  - Addresses Supabase security warning about mutable search_path
  
  ## Changes
  - Recreate update_updated_at_column with SET search_path = public
*/

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
