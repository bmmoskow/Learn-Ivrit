-- Remove redundant RLS policy that conflicts with authenticated user policy
DROP POLICY IF EXISTS "Block anonymous access to profiles" ON public.profiles;
