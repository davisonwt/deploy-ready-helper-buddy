CREATE OR REPLACE FUNCTION public.process_referral(p_referred_user_id uuid, p_referral_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_user_id uuid;
  v_affiliate_id uuid;
  v_normalized_code text;
  v_circle_inserted boolean := false;
  v_referral_inserted boolean := false;
BEGIN
  v_normalized_code := NULLIF(regexp_replace(UPPER(COALESCE(p_referral_code, '')), '[^A-Z0-9-]', '', 'g'), '');

  IF v_normalized_code IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  SELECT a.user_id, a.id
  INTO v_referrer_user_id, v_affiliate_id
  FROM public.affiliates a
  WHERE UPPER(a.referral_code) = v_normalized_code
    AND COALESCE(a.is_active, true) = true
  ORDER BY a.created_at ASC
  LIMIT 1;

  IF v_referrer_user_id IS NULL THEN
    SELECT ur.user_id
    INTO v_referrer_user_id
    FROM public.user_referrals ur
    WHERE UPPER(ur.referral_code) = v_normalized_code
    LIMIT 1;

    IF v_referrer_user_id IS NOT NULL THEN
      SELECT a.id
      INTO v_affiliate_id
      FROM public.affiliates a
      WHERE a.user_id = v_referrer_user_id
        AND COALESCE(a.is_active, true) = true
      ORDER BY a.created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  IF v_referrer_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_user_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.referral_circle WHERE referred_user_id = p_referred_user_id
  ) THEN
    INSERT INTO public.referral_circle (referrer_id, referred_user_id)
    VALUES (v_referrer_user_id, p_referred_user_id);
    v_circle_inserted := true;
  END IF;

  IF v_affiliate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.referrals WHERE referred_id = p_referred_user_id
  ) THEN
    INSERT INTO public.referrals (referrer_id, referred_id, status, commission_amount, commission_rate)
    VALUES (v_affiliate_id, p_referred_user_id, 'completed', 0, 10);
    v_referral_inserted := true;
  END IF;

  IF v_circle_inserted THEN
    UPDATE public.user_referrals
    SET total_signups = total_signups + 1
    WHERE user_id = v_referrer_user_id;
  END IF;

  IF v_referral_inserted THEN
    UPDATE public.affiliates
    SET total_referrals = total_referrals + 1,
        updated_at = now()
    WHERE id = v_affiliate_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'referrer_id', v_referrer_user_id,
    'affiliate_id', v_affiliate_id,
    'circle_inserted', v_circle_inserted,
    'referral_inserted', v_referral_inserted
  );
END;
$function$;