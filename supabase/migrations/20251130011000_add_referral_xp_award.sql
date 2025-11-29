-- Add XP award for referrals when someone signs up using a referral code
-- This updates the initialize_user_progress function to also award XP to referrer

-- Create or replace function to handle referral XP
CREATE OR REPLACE FUNCTION public.award_referral_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_code_param TEXT;
  referrer_record RECORD;
BEGIN
  -- Check if user signed up with a referral code in metadata
  referral_code_param := NEW.raw_user_meta_data->>'referral_code';
  
  IF referral_code_param IS NOT NULL THEN
    -- Find the referrer by referral code
    SELECT user_id INTO referrer_record
    FROM public.affiliates
    WHERE referral_code = UPPER(referral_code_param)
    LIMIT 1;
    
    -- If referrer found, award 500 XP
    IF referrer_record.user_id IS NOT NULL THEN
      PERFORM public.add_xp(referrer_record.user_id, 500);
      
      -- Also create referral record if referrals table exists
      INSERT INTO public.referrals (referrer_id, referred_id, status)
      VALUES (referrer_record.user_id, NEW.id, 'completed')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to award referral XP on signup
DROP TRIGGER IF EXISTS award_referral_xp_on_signup ON auth.users;
CREATE TRIGGER award_referral_xp_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.award_referral_xp();

