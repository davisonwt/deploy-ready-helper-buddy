
-- Trigger function: auto-process referral when a profile is created
-- Reads referral_code from auth.users raw_user_meta_data
CREATE OR REPLACE FUNCTION public.auto_process_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
  v_referrer_id uuid;
BEGIN
  -- Get referral code from user metadata
  SELECT (raw_user_meta_data->>'referral_code')
  INTO v_referral_code
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Exit if no referral code
  IF v_referral_code IS NULL OR v_referral_code = '' THEN
    RETURN NEW;
  END IF;

  -- Find the referrer
  SELECT user_id INTO v_referrer_id
  FROM public.user_referrals
  WHERE referral_code = v_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referral_circle WHERE referred_user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;

  -- Create relationship
  INSERT INTO public.referral_circle (referrer_id, referred_user_id)
  VALUES (v_referrer_id, NEW.user_id);

  -- Increment signups counter
  UPDATE public.user_referrals
  SET total_signups = total_signups + 1
  WHERE user_id = v_referrer_id;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_profile_created_process_referral ON public.profiles;

-- Create trigger on profile insert
CREATE TRIGGER on_profile_created_process_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_process_referral();
