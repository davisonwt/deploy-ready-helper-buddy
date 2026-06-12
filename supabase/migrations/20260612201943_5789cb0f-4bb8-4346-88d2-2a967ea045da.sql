DROP POLICY IF EXISTS "Service can insert referral circle" ON public.referral_circle;
CREATE POLICY "Service role can insert referral circles"
ON public.referral_circle
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "System can insert achievements" ON public.user_achievements;