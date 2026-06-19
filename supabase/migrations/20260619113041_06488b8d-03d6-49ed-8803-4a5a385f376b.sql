CREATE OR REPLACE FUNCTION public.trg_auto_create_user_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_code text;
  max_attempts integer := 10;
  attempt integer := 0;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_referrals WHERE user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;

  LOOP
    attempt := attempt + 1;
    new_code := public.generate_referral_code();
    BEGIN
      INSERT INTO public.user_referrals (user_id, referral_code)
      VALUES (NEW.user_id, new_code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF EXISTS (
        SELECT 1 FROM public.user_referrals WHERE user_id = NEW.user_id
      ) THEN
        RETURN NEW;
      END IF;

      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Could not generate unique referral code after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

INSERT INTO public.profiles (
  user_id,
  email,
  first_name,
  last_name,
  display_name,
  avatar_url,
  bio,
  location,
  preferred_currency,
  timezone,
  country,
  phone,
  membership_tier,
  updated_at
)
SELECT
  '9cb1b19c-08dc-4586-95dd-23bb5f022428',
  'davison@sow2grow.online',
  p.first_name,
  p.last_name,
  p.display_name,
  p.avatar_url,
  p.bio,
  COALESCE(NULLIF(p.location, ''), 'South Africa'),
  COALESCE(NULLIF(p.preferred_currency, ''), 'ZAR'),
  COALESCE(NULLIF(p.timezone, ''), 'Africa/Johannesburg'),
  COALESCE(NULLIF(p.country, ''), 'south africa'),
  COALESCE(NULLIF(p.phone, ''), '0788442047'),
  p.membership_tier,
  now()
FROM public.profiles p
WHERE p.user_id = '04754d57-d41d-4ea7-93df-542047a6785b'
ON CONFLICT (user_id) DO UPDATE SET
  first_name = COALESCE(NULLIF(public.profiles.first_name, ''), EXCLUDED.first_name),
  last_name = COALESCE(NULLIF(public.profiles.last_name, ''), EXCLUDED.last_name),
  display_name = COALESCE(NULLIF(public.profiles.display_name, ''), EXCLUDED.display_name),
  avatar_url = COALESCE(NULLIF(public.profiles.avatar_url, ''), EXCLUDED.avatar_url),
  location = COALESCE(NULLIF(public.profiles.location, ''), EXCLUDED.location),
  preferred_currency = COALESCE(NULLIF(public.profiles.preferred_currency, ''), EXCLUDED.preferred_currency),
  timezone = COALESCE(NULLIF(public.profiles.timezone, ''), EXCLUDED.timezone),
  country = COALESCE(NULLIF(public.profiles.country, ''), EXCLUDED.country),
  phone = COALESCE(NULLIF(public.profiles.phone, ''), EXCLUDED.phone),
  membership_tier = COALESCE(NULLIF(public.profiles.membership_tier, ''), EXCLUDED.membership_tier),
  updated_at = now();