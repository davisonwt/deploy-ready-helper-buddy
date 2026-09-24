-- Two welcome messages for every new member, from "S2G GoSats".
--
-- ALREADY APPLIED on 2026-09-24 via the Management API; this file records
-- it, because this project's migration ledger is drifted.
--
-- SENDER. No new identity, no new column, no fake auth user. This codebase
-- already has a system-sender convention and the UI already honours it:
-- chat_messages.sender_id is nullable, and ChatMessage.jsx:31 reads
--   const isSystemMessage = !message.sender_id && message.system_metadata?.is_system
-- then line 206 renders system_metadata.sender_name (falling back to
-- 'System') with a robot avatar. create_verification_room already posts
-- this way as "Sow2Grow Bot". So these post with sender_id NULL and
-- sender_name 'S2G GoSats' -- which is exactly "never a real member's
-- user_id", enforced by the database rather than by convention.
--
-- RLS is already correct and is NOT touched here. On chat_messages,
-- "Users insert own non-system messages" requires sender_id = auth.uid()
-- AND forbids system_metadata->>'is_system' = 'true', so no member can
-- forge one; "System messages service role only" allows exactly the
-- null-sender system shape to service_role. This function is SECURITY
-- DEFINER, so it inserts as the owner and needs no new policy. (Gosats
-- can already post anything via "Gosats can manage chat messages" --
-- pre-existing, deliberately left alone.)
--
-- TRIBE. There is no tribe entity in this schema: no tribes table, and
-- "My Tribe" in the app is a member's own referral circle
-- (TribeRosterPanel counts referral_circle by referrer). So a new member
-- joins THEIR REFERRER'S tribe, and the label is derived from the
-- referrer's display name -- "<referrer>'s tribe". A member who arrives
-- with no referral has no tribe and is welcomed to the Global Tribe only.
--
-- HOOK POINT. Two triggers, one guarantee.
--   1. referral_circle AFTER INSERT -- fires the moment the tribe becomes
--      known, which is where both facts are true at once. This covers the
--      normal path (signUp metadata -> handle_new_user -> profiles insert
--      -> auto_process_referral -> process_referral -> referral_circle)
--      AND the late path (useAuth's belt-and-braces claim_referral_code
--      RPC after signup).
--   2. profiles AFTER INSERT, named zz_* so it sorts LAST among this
--      table's AFTER triggers -- Postgres fires same-event triggers in
--      name order, and the existing chain is
--      on_profile_created_global_chat_join (adds them to Global) <
--      on_profile_created_process_referral (does the referral) < ... <
--      zz_member_welcome_on_profile. So by the time this runs, a referred
--      member has already been welcomed by trigger 1 and this is a no-op;
--      an unreferred member, or one whose code was invalid, gets the
--      Global-Tribe-only welcome here. That ordering is why the fallback
--      cannot pre-empt the tribe.
--
-- Reading referrer_id straight off the referral_circle row matters:
-- process_referral inserts that row BEFORE it updates profiles.referred_by,
-- so at trigger-1 time referred_by is not set yet.
--
-- ONE FIRING PER MEMBER is the member_welcomes primary key, not a check
-- -- whoever wins the insert does the work and everyone else returns, so
-- retries, re-runs and both triggers firing in one transaction can never
-- double-post.

create table if not exists public.member_welcomes (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  welcomed_at        timestamptz not null default now(),
  referrer_id        uuid,
  tribe_label        text,
  global_message_id  uuid,
  private_room_id    uuid,
  private_message_id uuid,
  global_skipped     text  -- why no Global post, when there is none
);

comment on table public.member_welcomes is
  'One row per member welcomed. The primary key IS the once-only guarantee.';

create or replace function public.send_member_welcome(
  p_user_id uuid,
  p_referrer_id uuid default null
)
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

-- Trigger 1: the tribe is known.
create or replace function public.trg_member_welcome_on_referral()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  -- A welcome must never be able to fail a signup or a referral claim.
  begin
    perform public.send_member_welcome(NEW.referred_user_id, NEW.referrer_id);
  exception when others then
    raise warning 'member welcome (referral path) failed for %: %', NEW.referred_user_id, sqlerrm;
  end;
  return NEW;
end;
$function$;

drop trigger if exists member_welcome_on_referral on public.referral_circle;
create trigger member_welcome_on_referral
  after insert on public.referral_circle
  for each row execute function public.trg_member_welcome_on_referral();

-- Trigger 2: the fallback, deliberately last.
create or replace function public.trg_member_welcome_on_profile()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  begin
    perform public.send_member_welcome(NEW.user_id, null);
  exception when others then
    raise warning 'member welcome (profile path) failed for %: %', NEW.user_id, sqlerrm;
  end;
  return NEW;
end;
$function$;

drop trigger if exists zz_member_welcome_on_profile on public.profiles;
create trigger zz_member_welcome_on_profile
  after insert on public.profiles
  for each row execute function public.trg_member_welcome_on_profile();

-- Read: gosat only. Write: nobody from a client -- the table grants SELECT
-- and nothing else, and the trigger runs as the function owner.
alter table public.member_welcomes enable row level security;

drop policy if exists "Gosat can read member welcomes" on public.member_welcomes;
create policy "Gosat can read member welcomes"
  on public.member_welcomes for select
  to authenticated
  using (public.is_admin_or_gosat(auth.uid()));

revoke all on public.member_welcomes from authenticated, anon;
grant select on public.member_welcomes to authenticated;
