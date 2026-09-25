-- Referral counters that cannot drift, and a welcome that hands the new
-- member their OWN invite link.
--
-- 1. COUNTERS. Two stored counters, each now maintained by a trigger on
--    the rows it counts, instead of by an increment inside
--    process_referral that nothing ever reversed:
--      user_referrals.total_signups   = rows in referral_circle whose
--                                       referrer_id is that member
--      affiliates.total_referrals     = rows in referrals whose
--                                       referrer_id is that affiliate row
--    Insert adds one, delete removes one, and moving a row to another
--    referrer (a re-attribution) moves exactly one from the old to the
--    new. Plain row-level AFTER triggers, not deferred: PostgREST runs
--    every request in its own transaction, and these behave the same
--    inside and outside one.
--    process_referral loses its own two increments, or every new signup
--    would count twice. Nothing else writes either counter
--    (recompute_tribal_score only reads affiliates.total_referrals).
--
-- 2. A one-off recompute from the rows, so the triggers start from truth.
--    Measured before this ran: every user_referrals.total_signups already
--    matched (the 2026-09-22 hygiene recompute); one affiliates row was
--    wrong -- davison.taljaard's active S2G-XVZ8K4P5 row, 43 stored
--    against 40 rows. Old values: scripts/studio/restore-referrals-2026-09-25.sql.
--
-- 3. The private welcome ends with the member's own invite link,
--    https://sow2growapp.com/stall/<username>?ref=<their code>. The code
--    is an affiliates code -- the only kind process_referral resolves, and
--    the same one every in-app share button burns in. A new member has
--    none yet at the moment the welcome fires, so it is minted here the
--    same way ensure_my_referral_code does, by an internal function that
--    no client can call.

-- ------------------------------------------------------------ 1. triggers
create or replace function public.trg_referral_circle_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.referrer_id is distinct from new.referrer_id) then
    update public.user_referrals set total_signups = total_signups - 1 where user_id = old.referrer_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or old.referrer_id is distinct from new.referrer_id) then
    update public.user_referrals set total_signups = total_signups + 1 where user_id = new.referrer_id;
  end if;
  return null;
end;
$$;

drop trigger if exists referral_circle_count on public.referral_circle;
create trigger referral_circle_count
  after insert or delete or update of referrer_id on public.referral_circle
  for each row execute function public.trg_referral_circle_count();

create or replace function public.trg_referrals_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.referrer_id is distinct from new.referrer_id) then
    update public.affiliates set total_referrals = total_referrals - 1, updated_at = now() where id = old.referrer_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or old.referrer_id is distinct from new.referrer_id) then
    update public.affiliates set total_referrals = total_referrals + 1, updated_at = now() where id = new.referrer_id;
  end if;
  return null;
end;
$$;

drop trigger if exists referrals_count on public.referrals;
create trigger referrals_count
  after insert or delete or update of referrer_id on public.referrals
  for each row execute function public.trg_referrals_count();

revoke all on function public.trg_referral_circle_count() from public, anon, authenticated;
revoke all on function public.trg_referrals_count() from public, anon, authenticated;

-- process_referral, identical apart from the two counter increments.
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

  -- Counters: user_referrals.total_signups and affiliates.total_referrals
  -- are kept by the referral_circle_count / referrals_count triggers.

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

-- ----------------------------------------------------------- 2. recompute
update public.user_referrals u
   set total_signups = c.n
  from (select u2.user_id, (select count(*) from public.referral_circle rc where rc.referrer_id = u2.user_id)::int n
          from public.user_referrals u2) c
 where c.user_id = u.user_id and u.total_signups is distinct from c.n;

update public.affiliates a
   set total_referrals = c.n, updated_at = now()
  from (select a2.id, (select count(*) from public.referrals r where r.referrer_id = a2.id)::int n
          from public.affiliates a2) c
 where c.id = a.id and a.total_referrals is distinct from c.n;

-- ------------------------------------------------------ 3. invite link
-- Internal: a member's active affiliates code, minted if they have none.
-- Same selection and minting as ensure_my_referral_code, for a given
-- member instead of auth.uid(). Not callable from a client.
create or replace function public.referral_code_for(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if p_user_id is null then return null; end if;

  select referral_code into v_code from public.affiliates
   where user_id = p_user_id and coalesce(is_active, true)
   order by (referral_code like 'S2G-%') desc, created_at asc limit 1;
  if v_code is not null then return v_code; end if;

  for i in 1..10 loop
    v_code := public.generate_referral_code();
    begin
      insert into public.affiliates (user_id, referral_code, earnings, commission_rate)
      values (p_user_id, v_code, 0, 10);
      return v_code;
    exception when unique_violation then
      select referral_code into v_code from public.affiliates
       where user_id = p_user_id and coalesce(is_active, true)
       order by (referral_code like 'S2G-%') desc, created_at asc limit 1;
      if v_code is not null then return v_code; end if;
    end;
  end loop;
  return null;
end;
$$;

revoke all on function public.referral_code_for(uuid) from public, anon, authenticated;

create or replace function public.send_member_welcome(p_user_id uuid, p_referrer_id uuid DEFAULT NULL::uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  v_username text;
  v_code     text;
  v_invite   text;
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
                        from auth.users u where u.id = p_user_id), false),
         nullif(btrim(p.username), '')
    into v_name, v_is_test, v_username
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

  -- The member's own door: their stall, carrying their own code, so what
  -- they share credits them -- not the link they arrived on. A failure
  -- here drops the line, never the welcome.
  begin
    v_code := public.referral_code_for(p_user_id);
  exception when others then
    v_code := null;
  end;
  if v_code is not null then
    v_invite := case when v_username is not null
      then 'https://sow2growapp.com/stall/' || v_username || '?ref=' || v_code
      else 'https://sow2growapp.com/?ref=' || v_code
    end;
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
      || 'The GoSats are in this room if you need anything — just reply.'
      || case when v_invite is not null
           then E'\n\nInvite people with your own link: ' || v_invite
           else '' end,
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
