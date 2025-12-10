-- Explicitly block anonymous users from accessing profiles
CREATE POLICY "Block anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);