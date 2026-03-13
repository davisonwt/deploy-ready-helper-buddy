-- Make referral attribution resilient by processing at auth user creation time
-- and by delegating profile-trigger handling to the canonical process_referral function.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_username text;
  normalized_referral_code text;
BEGIN
  -- Extract username from raw_user_meta_data, or generate from email
  user_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    user_id,
    first_name,
    last_name,
    phone,
    location,
    preferred_currency,
    timezone,
    country,
    username
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'preferred_currency',
    NEW.raw_user_meta_data->>'timezone',
    NEW.raw_user_meta_data->>'country',
    user_username
  );

  -- Referral fallback at auth trigger stage (covers timing gaps)
  normalized_referral_code := NULLIF(UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'referral_code', ''))), '');
  IF normalized_referral_code IS NOT NULL THEN
    PERFORM public.process_referral(NEW.id, normalized_referral_code);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_process_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
BEGIN
  -- Read and normalize referral code from auth metadata
  SELECT NULLIF(UPPER(TRIM(COALESCE(raw_user_meta_data->>'referral_code', ''))), '')
  INTO v_referral_code
  FROM auth.users
  WHERE id = NEW.user_id;

  IF v_referral_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Delegate to canonical processor (idempotent via "already referred" guard)
  PERFORM public.process_referral(NEW.user_id, v_referral_code);

  RETURN NEW;
END;
$$;

-- Backfill any missed referral links for existing users
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      u.id AS referred_user_id,
      NULLIF(UPPER(TRIM(COALESCE(u.raw_user_meta_data->>'referral_code', ''))), '') AS referral_code
    FROM auth.users u
    LEFT JOIN public.referral_circle rc ON rc.referred_user_id = u.id
    WHERE NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'referral_code', '')), '') IS NOT NULL
      AND rc.id IS NULL
  LOOP
    PERFORM public.process_referral(r.referred_user_id, r.referral_code);
  END LOOP;
END;
$$;