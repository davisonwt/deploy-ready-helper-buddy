
-- Simple RPC to increment referral clicks
CREATE OR REPLACE FUNCTION public.increment_referral_clicks(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_referrals
  SET total_clicks = total_clicks + 1
  WHERE referral_code = p_code;
END;
$$;
