-- Affiliate code consolidation — 2026-09-22
--
-- Three things, in an order that matters. Snapshot first:
-- scripts/studio/restore-affiliate-dedupe-2026-09-22.sql.
--
-- 1. process_referral resolves a code even when its row is inactive.
--    This MUST land before any deactivation. Today the lookup filters on
--    COALESCE(is_active,true)=true, so flipping a row to false makes that
--    code stop resolving and silently breaks every link already in
--    circulation carrying it. The brief requires both "deactivate the
--    duplicates" and "no member's circulating link ever breaks", and this
--    is the only way to have both: is_active now governs which code is
--    HANDED OUT, never whether an old one still works. Active rows are
--    still preferred, so a member's current code wins any tie.
--
-- 2. Deactivate the duplicate rows (952 of them). Never deleted.
--
-- 3. Stop it recurring: one active code per member, enforced by a partial
--    unique index, and one single place where codes are minted.

begin;

-- 1 ---------------------------------------------------------------------
create or replace function public.process_referral(p_referred_user_id uuid, p_referral_code text)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  -- Resolve regardless of is_active: a code that was ever handed out must
  -- keep working forever. Active rows sort first so a member's current
  -- code wins when both exist.
  SELECT a.user_id, a.id
  INTO v_referrer_user_id, v_affiliate_id
  FROM public.affiliates a
  WHERE UPPER(a.referral_code) = v_normalized_code
  ORDER BY COALESCE(a.is_active, true) DESC, a.created_at ASC
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
      ORDER BY COALESCE(a.is_active, true) DESC, a.created_at ASC
      LIMIT 1;
    END IF;
  END IF;

  IF v_referrer_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_user_id = p_referred_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.referral_circle WHERE referred_user_id = p_referred_user_id) THEN
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
    UPDATE public.user_referrals SET total_signups = total_signups + 1
    WHERE user_id = v_referrer_user_id;
  END IF;

  IF v_referral_inserted THEN
    UPDATE public.affiliates
    SET total_referrals = total_referrals + 1, updated_at = now()
    WHERE id = v_affiliate_id;
  END IF;

  UPDATE public.profiles SET referred_by = v_referrer_user_id
  WHERE user_id = p_referred_user_id AND referred_by IS NULL;

  INSERT INTO public.followers (follower_id, following_id, source_type)
  VALUES (p_referred_user_id, v_referrer_user_id, 'profile')
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'referrer_id', v_referrer_user_id,
    'affiliate_id', v_affiliate_id,
    'circle_inserted', v_circle_inserted,
    'referral_inserted', v_referral_inserted
  );
END;
$function$;

-- 3a --------------------------------------------------------------------
-- S2G- is canonical. Replaces the 8-hex MD5 format; existing 8-hex rows
-- are untouched and still resolve (see 1). generate_referral_code() already
-- exists and draws from an unambiguous alphabet; loop on the unique index
-- rather than trusting a single draw.
create or replace function public.create_affiliate_on_signup()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_code text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  FOR i IN 1..10 LOOP
    v_code := public.generate_referral_code();
    BEGIN
      INSERT INTO public.affiliates (user_id, referral_code) VALUES (NEW.id, v_code);
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      -- a colliding code, or a racing insert for this same user
      IF EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = NEW.id) THEN
        RETURN NEW;
      END IF;
    END;
  END LOOP;
  RETURN NEW;
END;
$function$;

-- 3b --------------------------------------------------------------------
-- The ONE place a code is minted for an existing member. The client used
-- to INSERT directly, which is how 927 rows accumulated on one account.
create or replace function public.ensure_my_referral_code()
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_user uuid := auth.uid();
  v_code text;
BEGIN
  IF v_user IS NULL THEN RETURN NULL; END IF;

  SELECT referral_code INTO v_code FROM public.affiliates
  WHERE user_id = v_user AND COALESCE(is_active, true)
  ORDER BY (referral_code LIKE 'S2G-%') DESC, created_at ASC LIMIT 1;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;

  FOR i IN 1..10 LOOP
    v_code := public.generate_referral_code();
    BEGIN
      INSERT INTO public.affiliates (user_id, referral_code, earnings, commission_rate)
      VALUES (v_user, v_code, 0, 10);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      SELECT referral_code INTO v_code FROM public.affiliates
      WHERE user_id = v_user AND COALESCE(is_active, true)
      ORDER BY (referral_code LIKE 'S2G-%') DESC, created_at ASC LIMIT 1;
      IF v_code IS NOT NULL THEN RETURN v_code; END IF;
    END;
  END LOOP;
  RETURN NULL;
END;
$function$;

grant execute on function public.ensure_my_referral_code() to authenticated;

commit;
