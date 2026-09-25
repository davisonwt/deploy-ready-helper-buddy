-- SNAPSHOT + RESTORE: referrals, captured 2026-09-25 BEFORE
--   supabase/migrations/20260925130000_referral_counters_and_invite_link.sql
--   scripts/studio/reattribute-referrals-2026-09-25.sql
-- Every row is named by id. Parts are independent; run what you need.
--
-- PART A  restores process_referral and send_member_welcome exactly as
--         they were, and removes the counter triggers and referral_code_for.
-- PART B  puts every counter the recompute or the re-attribution changed
--         back to its stored value. The ONLY value the recompute itself
--         changed was davison.taljaard's affiliates row (43 -> 40).
-- PART C  undoes the two re-attributions.
--
-- Run PART C before PART B if you run both with the triggers still in
-- place: C's own row moves would otherwise shift the counters again.

-- ======================================================== PART A
begin;
drop trigger if exists referral_circle_count on public.referral_circle;
drop trigger if exists referrals_count on public.referrals;
drop function if exists public.trg_referral_circle_count();
drop function if exists public.trg_referrals_count();
drop function if exists public.referral_code_for(uuid);

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

CREATE OR REPLACE FUNCTION public.send_member_welcome(p_user_id uuid, p_referrer_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_name     text;
  v_is_test  boolean;
  v_referrer uuid;
  v_tribe    text;
  v_room_id  uuid;
  v_global   uuid;
  v_msg      uuid;
  v_skip     text;
  v_gosat    record;
begin
  -- Claim the member. Losing this race means someone else is welcoming
  -- them right now, or already did.
  insert into public.member_welcomes (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
  if not found then
    return;
  end if;

  -- is_test comes from TWO places on purpose. profiles.is_test is the
  -- real flag, but nothing sets it at signup: handle_new_user never
  -- writes it and the column defaults to false, so it is always false at
  -- the moment this runs for a freshly created account (it is set later,
  -- by hand or by a backfill -- see 20260920250000). Read alone it could
  -- therefore never suppress anything for a NEW test account, which is
  -- exactly the case the rule exists for. So a signup may also declare
  -- itself with raw_user_meta_data.is_test, which is the only marker that
  -- exists before the profile row does. A real member sets neither.
  select coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.first_name), ''), p.username),
         coalesce(p.is_test, false)
         or coalesce((select (u.raw_user_meta_data->>'is_test')::boolean
                        from auth.users u where u.id = p_user_id), false)
    into v_name, v_is_test
  from public.profiles p
  where p.user_id = p_user_id;

  if v_name is null then
    -- No profile to greet. Release the claim so a later, real attempt can
    -- still happen rather than being locked out by this one.
    delete from public.member_welcomes where user_id = p_user_id;
    return;
  end if;

  v_referrer := coalesce(
    p_referrer_id,
    (select referred_by from public.profiles where user_id = p_user_id),
    (select rc.referrer_id from public.referral_circle rc
      where rc.referred_user_id = p_user_id order by rc.referred_at limit 1)
  );

  if v_referrer is not null then
    select coalesce(nullif(btrim(display_name), ''), nullif(btrim(first_name), ''), username)
      into v_tribe
    from public.profiles where user_id = v_referrer;
    if v_tribe is not null then
      v_tribe := v_tribe || '''s tribe';
    end if;
  end if;

  -- 1. Global announcement. Test accounts stay out of the members' room.
  if v_is_test then
    v_skip := 'is_test';
  else
    insert into public.chat_messages (room_id, sender_id, content, message_type, system_metadata)
    values (
      '00000000-0000-0000-0000-000000000001',  -- the Global room, same id join_global_chat_room uses
      null,
      case when v_tribe is not null
        then '🌱 ' || v_name || ' just joined S2G through ' || v_tribe
             || ' — welcome to the Global Tribe! Say hi and help them find their feet.'
        else '🌱 ' || v_name || ' just joined S2G'
             || ' — welcome to the Global Tribe! Say hi and help them find their feet.'
      end,
      'text',
      jsonb_build_object(
        'is_system', true,
        'sender_name', 'S2G GoSats',
        'type', 'member_welcome_global',
        'user_id', p_user_id
      )
    )
    returning id into v_global;
  end if;

  -- 2. Private welcome room: the member plus every current gosat. Same
  -- predicate as get_or_create_gosat_room -- role 'gosat' only, never
  -- admin. Reused if one already exists for this member.
  select r.id into v_room_id
  from public.chat_rooms r
  join public.chat_participants cp on cp.room_id = r.id and cp.user_id = p_user_id
  where r.name = 'Welcome to S2G'
  limit 1;

  if v_room_id is null then
    insert into public.chat_rooms (name, room_type, created_by, description, is_system_room)
    values ('Welcome to S2G', 'group', p_user_id,
            'Your first room on S2G, with the GoSats', true)
    returning id into v_room_id;
  end if;

  insert into public.chat_participants (room_id, user_id, is_active)
  values (v_room_id, p_user_id, true)
  on conflict (room_id, user_id) do nothing;

  for v_gosat in
    select distinct ur.user_id from public.user_roles ur where ur.role = 'gosat'
  loop
    insert into public.chat_participants (room_id, user_id, is_active, is_moderator)
    values (v_room_id, v_gosat.user_id, true, true)
    on conflict (room_id, user_id) do nothing;
  end loop;

  insert into public.chat_messages (room_id, sender_id, content, message_type, system_metadata)
  values (
    v_room_id,
    null,
    'Welcome to Sow2Grow, ' || v_name || '! You''re now part of '
      || case when v_tribe is not null then v_tribe || ' — and of ' else '' end
      || 'S2G''s Global Tribe. Start here: open your door, sow your first seed, and wander the orchard. '
      || 'The GoSats are in this room if you need anything — just reply.',
    'text',
    jsonb_build_object(
      'is_system', true,
      'sender_name', 'S2G GoSats',
      'type', 'member_welcome_private',
      'user_id', p_user_id
    )
  )
  returning id into v_msg;

  update public.member_welcomes
     set referrer_id = v_referrer,
         tribe_label = v_tribe,
         global_message_id = v_global,
         private_room_id = v_room_id,
         private_message_id = v_msg,
         global_skipped = v_skip
   where user_id = p_user_id;
end;
$function$;
commit;

-- ======================================================== PART B
-- Stored values before either script ran, by row.
begin;
update public.user_referrals set total_signups = 35 where user_id = '04754d57-d41d-4ea7-93df-542047a6785b';  -- davison.taljaard
update public.user_referrals set total_signups = 6  where user_id = '3971cc26-3894-4712-8f61-d50587c93dc9';  -- callth3guy (Louw)
update public.user_referrals set total_signups = 2  where user_id = 'b19c9972-b30e-4113-ad80-683e21a13063';  -- bianca.liebenberg123
update public.affiliates set total_referrals = 43 where id = 'a947ec5c-aa88-4d2f-b74b-63884e1ce423';  -- davison.taljaard S2G-XVZ8K4P5 (recompute: 43 -> 40)
update public.affiliates set total_referrals = 6  where id = 'f9f8e0da-f379-4593-aa56-8165725bde4f';  -- callth3guy 5012E49B
update public.affiliates set total_referrals = 0  where id = 'afda93b0-2914-47f3-8c23-3b91c817b1a5';  -- bianca.liebenberg123 70A9F6C3
commit;

-- ======================================================== PART C
begin;
-- Anton Laubscher (antoncrossm, bdea1480-...) had NO referrer: remove the
-- rows the re-attribution created for him, by their ids.
delete from public.referral_circle where id = 'ea399a9f-bf1d-4510-9759-603013ae470c';
delete from public.referrals       where id = '12408484-19b7-45be-8850-dc8bc6560438';
delete from public.followers       where id = '34ba32c3-6f97-481f-9f02-b98d1f5748e0';
update public.profiles set referred_by = null where user_id = 'bdea1480-503b-4f60-a2bf-5408c3de0757';

-- Otavio Costa (otaviocosta1973, ef206f1c-...) back to the founder.
update public.referral_circle set referrer_id = '04754d57-d41d-4ea7-93df-542047a6785b' where id = '037db024-d950-475b-9f0a-f0b7611cab16';
update public.referrals       set referrer_id = 'a947ec5c-aa88-4d2f-b74b-63884e1ce423' where id = '255d066b-75d1-426a-8b5f-7ddc69db1405';
update public.profiles set referred_by = '04754d57-d41d-4ea7-93df-542047a6785b' where user_id = 'ef206f1c-3c1c-49f4-8bca-3bddcb9deb51';
-- Otavio's follow of the founder (5ca2c550-...) was never touched.
commit;
