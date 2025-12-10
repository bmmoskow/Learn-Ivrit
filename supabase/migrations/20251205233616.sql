-- Set security_invoker to ensure the view uses caller's permissions
-- This makes the underlying table RLS policies apply
ALTER VIEW public.vocabulary_with_stats SET (security_invoker = true);
