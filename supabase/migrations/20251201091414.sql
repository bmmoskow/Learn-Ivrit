-- Add explicit policy to block anonymous users from accessing profiles table
-- This prevents unauthenticated users from reading email addresses
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);
