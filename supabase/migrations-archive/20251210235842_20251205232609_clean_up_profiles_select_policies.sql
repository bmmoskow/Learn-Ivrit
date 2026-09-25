-- Drop the conflicting/redundant SELECT policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can only view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;

-- Create a single clear SELECT policy
CREATE POLICY "Users can only view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);