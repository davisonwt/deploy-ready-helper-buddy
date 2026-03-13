-- Normalize referral codes at source to handle hidden characters from copy/paste.
CREATE OR REPLACE FUNCTION public.process_referral(p_referred_user_id uuid, p_referral_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_normalized_code text;
BEGIN
  -- Keep only valid referral characters to avoid hidden unicode issues
  v_normalized_code := NULLIF(regexp_replace(UPPER(COALESCE(p_referral_code, '')), '[^A-Z0-9-]', '', 'g'), '');

  IF v_normalized_code IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Find the referrer
  SELECT user_id INTO v_referrer_id
  FROM public.user_referrals
  WHERE referral_code = v_normalized_code;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Prevent self-referral
  IF v_referrer_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referral_circle WHERE referred_user_id = p_referred_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User already referred');
  END IF;

  -- Create relationship
  INSERT INTO public.referral_circle (referrer_id, referred_user_id)
  VALUES (v_referrer_id, p_referred_user_id);

  -- Increment signups counter
  UPDATE public.user_referrals
  SET total_signups = total_signups + 1
  WHERE user_id = v_referrer_id;

  RETURN json_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$;

-- Backfill any remaining misses using normalized processing
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      u.id AS referred_user_id,
      u.raw_user_meta_data->>'referral_code' AS referral_code
    FROM auth.users u
    LEFT JOIN public.referral_circle rc ON rc.referred_user_id = u.id
    WHERE NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'referral_code', '')), '') IS NOT NULL
      AND rc.id IS NULL
  LOOP
    PERFORM public.process_referral(r.referred_user_id, r.referral_code);
  END LOOP;
END;
$$;