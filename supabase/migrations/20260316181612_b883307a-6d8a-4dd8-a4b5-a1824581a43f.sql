CREATE POLICY "Authenticated users can insert usage logs"
ON public.api_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);