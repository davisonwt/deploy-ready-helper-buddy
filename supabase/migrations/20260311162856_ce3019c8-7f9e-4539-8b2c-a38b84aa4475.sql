
-- Add all existing users to davison's tribe
INSERT INTO public.referral_circle (referrer_id, referred_user_id)
SELECT '04754d57-d41d-4ea7-93df-542047a6785b', p.user_id
FROM public.profiles p
WHERE p.user_id != '04754d57-d41d-4ea7-93df-542047a6785b'
AND NOT EXISTS (
  SELECT 1 FROM public.referral_circle rc 
  WHERE rc.referrer_id = '04754d57-d41d-4ea7-93df-542047a6785b' 
  AND rc.referred_user_id = p.user_id
);

-- Update the signups counter
UPDATE public.user_referrals
SET total_signups = (
  SELECT count(*) FROM public.referral_circle 
  WHERE referrer_id = '04754d57-d41d-4ea7-93df-542047a6785b'
)
WHERE user_id = '04754d57-d41d-4ea7-93df-542047a6785b';
