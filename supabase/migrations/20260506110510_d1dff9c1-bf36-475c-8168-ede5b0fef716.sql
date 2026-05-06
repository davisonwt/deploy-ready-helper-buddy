
-- 1. Ensure every existing auth user has a user_referrals row (so they have a referral code)
INSERT INTO public.user_referrals (user_id, referral_code)
SELECT u.id, public.generate_referral_code()
FROM auth.users u
LEFT JOIN public.user_referrals ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2. Backfill tribe links for the three named users
-- Davison referrer id
DO $$
DECLARE
  v_davison uuid := '04754d57-d41d-4ea7-93df-542047a6785b';
  v_bianca  uuid := 'b19c9972-b30e-4113-ad80-683e21a13063';
  v_ernie   uuid := '4dfc2eb7-20ec-412f-bd80-ee886a0a0b2b';
  v_vickee  uuid := 'bdb3153f-8f87-4fbf-bfcc-ea02356cc118';
BEGIN
  -- Bianca → Davison
  INSERT INTO public.referral_circle (referrer_id, referred_user_id, status)
  VALUES (v_davison, v_bianca, 'active')
  ON CONFLICT DO NOTHING;

  -- Ernie → Bianca
  INSERT INTO public.referral_circle (referrer_id, referred_user_id, status)
  VALUES (v_bianca, v_ernie, 'active')
  ON CONFLICT DO NOTHING;

  -- Vickee → Bianca
  INSERT INTO public.referral_circle (referrer_id, referred_user_id, status)
  VALUES (v_bianca, v_vickee, 'active')
  ON CONFLICT DO NOTHING;

  -- Recompute total_signups for affected referrers
  UPDATE public.user_referrals ur
  SET total_signups = (
    SELECT count(*) FROM public.referral_circle rc WHERE rc.referrer_id = ur.user_id
  )
  WHERE ur.user_id IN (v_davison, v_bianca);
END $$;

-- 3. claim_referral_code: lets a logged-in user attach to a tribe after signup
CREATE OR REPLACE FUNCTION public.claim_referral_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  RETURN public.process_referral(v_user, p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral_code(text) TO authenticated;
