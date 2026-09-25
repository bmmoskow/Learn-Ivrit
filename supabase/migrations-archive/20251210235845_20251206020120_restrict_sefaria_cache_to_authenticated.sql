-- Drop the existing public SELECT policy
DROP POLICY IF EXISTS "Anyone can read cached Sefaria content" ON public.sefaria_cache;

-- Create new policy restricted to authenticated users
CREATE POLICY "Authenticated users can read cached Sefaria content"
ON public.sefaria_cache
FOR SELECT
TO authenticated
USING (true);