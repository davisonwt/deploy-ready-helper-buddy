-- 20260922010000_referral_hygiene.sql
--
-- ============================================================
-- ALREADY APPLIED TO PRODUCTION on 2026-09-22, via the Supabase
-- Management API. DO NOT RE-RUN AS PART OF A DEPLOY.
-- ============================================================
--
-- Same pattern as 20260922000000_affiliate_consolidation.sql: a record of
-- what production contains, not an instruction. No row was inserted into
-- supabase_migrations.schema_migrations -- ledger reconciliation stays in
-- scripts/studio/migration-drift-plan-2026-09-21.md.
--
-- 1. process_referral no longer falls back to public.user_referrals.
-- 2. user_referrals.total_signups recomputed once from referral_circle.
-- 3. One missing affiliates row backfilled (cmbconcepts2020).
--
-- The table public.user_referrals and every row in it are UNTOUCHED apart
-- from the one-off total_signups recompute. Nothing is dropped.

begin;

-- 1 ---------------------------------------------------------------------
-- Why the fallback goes:
--
--   * Nothing hands out a user_referrals code. No application code reads
--     or writes that table at all -- the only mention under src/ is the
--     generated types.ts. Its 98 codes have never been distributed.
--   * Both tables now mint from generate_referral_code(), but each has its
--     OWN unique constraint, so one code space with two independent
--     guarantees. A collision would resolve to the affiliates owner and
--     silently rob the user_referrals owner. 0 today; the design allows it.
--   * The fallback resolves a member and then looks up THEIR affiliates row
--     for v_affiliate_id. With no such row it returns NULL, and the caller
--     writes referral_circle + profiles.referred_by + a follow but no
--     referrals row and no counter -- attribution that half-exists.
--
-- Removing it deletes both failure modes outright rather than managing
-- them. affiliates remains the single resolution source, and still
-- resolves inactive codes (see 20260922000000), so no circulating link
-- breaks.
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

-- 2 ---------------------------------------------------------------------
-- total_signups is trigger-owned from here. It was only ever incremented
-- when process_referral inserted a referral_circle row, so rows created by
-- trg_auto_create_user_referral started at 0 and historical referrals were
-- never counted. Measured 2026-09-22 before this ran: 2 of 98 rows wrong,
-- stored sum 41 against a true count of 40.
update public.user_referrals ur
   set total_signups = coalesce(rc.n, 0)
  from (select referrer_id, count(*) n from public.referral_circle group by 1) rc
 where rc.referrer_id = ur.user_id
   and coalesce(ur.total_signups, 0) is distinct from coalesce(rc.n, 0);

update public.user_referrals ur
   set total_signups = 0
 where not exists (select 1 from public.referral_circle rc where rc.referrer_id = ur.user_id)
   and coalesce(ur.total_signups, 0) <> 0;

comment on column public.user_referrals.total_signups is
  'Trigger-owned. Incremented by process_referral() only when it inserts a '
  'referral_circle row. Historical values were reconciled against '
  'referral_circle on 2026-09-22; before that date they were unreliable and '
  'nothing may read them as authoritative. The authoritative count of who a '
  'member has referred is public.referral_circle.';

comment on function public.trg_auto_create_user_referral() is
  'Creates one public.user_referrals row per profile, code from '
  'generate_referral_code(). NOTE: no surface hands these codes out, and '
  'process_referral() stopped falling back to this table on 2026-09-22 -- '
  'public.affiliates is the single referral-code resolution source.';

-- 3 ---------------------------------------------------------------------
-- cmbconcepts2020 (cce69b0d-0faa-45d6-bfeb-9a7b2198e09f) had a
-- user_referrals row but no affiliates row -- the one member for whom the
-- dropped fallback could have produced half an attribution.
-- ensure_my_referral_code() would self-heal them on their first share, but
-- only if they ever share. Their existing code is reused rather than a new
-- one minted, so the string stays stable for them.
insert into public.affiliates (user_id, referral_code, earnings, commission_rate)
select ur.user_id, ur.referral_code, 0, 10
  from public.user_referrals ur
 where ur.user_id = 'cce69b0d-0faa-45d6-bfeb-9a7b2198e09f'::uuid
   and not exists (select 1 from public.affiliates a where a.user_id = ur.user_id)
   and not exists (select 1 from public.affiliates a2 where upper(a2.referral_code) = upper(ur.referral_code));

commit;
