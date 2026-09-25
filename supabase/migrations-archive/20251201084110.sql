-- Add explicit policy to block anonymous access to profiles table
-- This ensures that unauthenticated users cannot attempt to read email addresses
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Also ensure authenticated users can only see their own profile
-- (This policy already exists but we're making it more explicit)
CREATE POLICY "Authenticated users can only view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
