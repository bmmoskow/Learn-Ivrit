-- Allow users to view their own rate limit records
CREATE POLICY "Users can view own rate limits"
ON public.gemini_api_rate_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
