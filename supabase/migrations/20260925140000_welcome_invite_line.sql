-- The private welcome's invite line, reworded, and its link now works for
-- every member: /stall/<username>?ref=<code> opens the stall when there is
-- one and a join page naming the inviter when there isn't (StallVisitPage
-- -> InviteJoinView; api/stall.ts for the link preview).
--
-- Only the message text changes; send_member_welcome is otherwise exactly
-- as 20260925130000 left it. Restore: re-run that migration's
-- send_member_welcome, or scripts/studio/restore-referrals-2026-09-25.sql
-- PART A for the version before either.

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

  -- The member's own invite link (src/lib/invite/inviteLink.ts builds the
  -- same URL): their stall when they have one, a join page naming them
  -- when they don't, always carrying their own code -- so what they share
  -- credits them, not the link they arrived on. A failure here drops the
  -- line, never the welcome.
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
           then E'\n\nInvite people with your own link — they''ll join your tribe.\n' || v_invite
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
