<<<<<<< HEAD
CREATE POLICY "Authenticated users can insert usage logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
=======
CREATE POLICY "Authenticated users can insert usage logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
>>>>>>> b7894df8078cd44dd9b5d2b90c24436d3b548327
WITH CHECK (true);