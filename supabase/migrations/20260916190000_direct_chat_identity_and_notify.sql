-- Direct-message repair, layers 2 and 3.
--
-- Layer 2, identity: chat_participants.profile_id was never set by any
-- writer, so a direct room had no counterpart to name it after and
-- rendered as "Chat" with no avatar. Fixed at the table, with a trigger,
-- rather than in each call site, so no future writer can reintroduce it.
--
-- Layer 3, notification: public.user_notifications only permits
-- auth.uid() = user_id on INSERT, so a member can only notify THEMSELVES.
-- Every member-to-member notification in the app is therefore silently
-- refused with 42501 today, including chat invites (ChatApp.tsx) and
-- classroom invites (useClassroomInvites.ts), both of which swallow the
-- error. notify_member() is the working write path: same table, same
-- inbox, same shape, just a SECURITY DEFINER function that checks the
-- caller is entitled to reach that person, exactly as send_chat_message()
-- already does for chat_messages.
--
-- Idempotent. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. profile_id is filled automatically, for every writer, forever
-- ---------------------------------------------------------------------------
create or replace function public.chat_participants_fill_profile_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $cp_fill$
begin
  if new.profile_id is null then
    select p.id into new.profile_id
    from public.profiles p
    where p.user_id = new.user_id
    limit 1;
  end if;
  return new;
end;
$cp_fill$;

drop trigger if exists trg_chat_participants_fill_profile_id on public.chat_participants;
create trigger trg_chat_participants_fill_profile_id
  before insert or update of user_id on public.chat_participants
  for each row
  execute function public.chat_participants_fill_profile_id();

comment on function public.chat_participants_fill_profile_id is
  'Fills chat_participants.profile_id from user_id when a writer omits it. Direct rooms are named after the counterpart profile, so a null here made them render as "Chat".';

-- ---------------------------------------------------------------------------
-- 2. get_or_create_direct_room also sets it explicitly
--    The trigger above already covers this. Setting it here too keeps the
--    function honest on its own, so reading it does not mislead.
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_direct_room(user1_id uuid, user2_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $godr$
declare
  v_room_id uuid;
begin
  select cr.id into v_room_id
  from chat_rooms cr
  where cr.room_type = 'direct'
    and cr.is_active = true
    and exists (
      select 1 from chat_participants cp1
      where cp1.room_id = cr.id and cp1.user_id = user1_id and cp1.is_active = true
    )
    and exists (
      select 1 from chat_participants cp2
      where cp2.room_id = cr.id and cp2.user_id = user2_id and cp2.is_active = true
    )
  limit 1;

  if v_room_id is not null then
    return v_room_id;
  end if;

  insert into chat_rooms (name, room_type, created_by, is_system_room, is_active)
  values ('Direct Chat', 'direct', user1_id, false, true)
  returning id into v_room_id;

  insert into chat_participants (room_id, user_id, is_active, profile_id)
  values (v_room_id, user1_id, true, (select p.id from profiles p where p.user_id = user1_id limit 1))
  on conflict (room_id, user_id) do update set is_active = true;

  insert into chat_participants (room_id, user_id, is_active, profile_id)
  values (v_room_id, user2_id, true, (select p.id from profiles p where p.user_id = user2_id limit 1))
  on conflict (room_id, user_id) do update set is_active = true;

  return v_room_id;
end;
$godr$;

-- ---------------------------------------------------------------------------
-- 3. notify_member - a member-to-member notification that actually lands
--
--    Authorisation: the caller must already share an ACTIVE chat room with
--    the recipient, or be an admin/gosat. That is the same entitlement that
--    lets them message the person in the first place, so this grants no new
--    reach; it only stops the write being refused by RLS.
--
--    Returns the new notification id, or null when a matching unread
--    notification already exists, which keeps repeat calls idempotent
--    rather than spamming an inbox.
-- ---------------------------------------------------------------------------
create or replace function public.notify_member(
  _recipient  uuid,
  _type       text,
  _title      text,
  _message    text,
  _action_url text default null,
  _metadata   jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $notify$
declare
  v_caller uuid := auth.uid();
  v_id     uuid;
begin
  if v_caller is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if _recipient is null then
    raise exception 'A recipient is required' using errcode = '22023';
  end if;

  if coalesce(btrim(_type), '') = '' or coalesce(btrim(_title), '') = ''
     or coalesce(btrim(_message), '') = '' then
    raise exception 'type, title and message are all required' using errcode = '22023';
  end if;

  -- Entitlement: a shared active room, yourself, or admin/gosat.
  if v_caller <> _recipient
     and not public.is_admin_or_gosat(v_caller)
     and not exists (
       select 1
       from chat_participants me
       join chat_participants them on them.room_id = me.room_id
       where me.user_id = v_caller
         and them.user_id = _recipient
         and me.is_active
         and them.is_active
     )
  then
    raise exception 'Not allowed to notify this member' using errcode = '42501';
  end if;

  -- Do not stack an identical unread notification.
  select n.id into v_id
  from user_notifications n
  where n.user_id = _recipient
    and n.type = _type
    and n.message = _message
    and n.is_read = false
  limit 1;

  if v_id is not null then
    return null;
  end if;

  insert into user_notifications (user_id, type, title, message, action_url, metadata)
  values (_recipient, _type, _title, _message, _action_url, _metadata)
  returning id into v_id;

  return v_id;
end;
$notify$;

comment on function public.notify_member is
  'Creates a user_notifications row for another member. Needed because that table only permits auth.uid() = user_id on INSERT, which silently refused every member-to-member notification in the app. Caller must share an active chat room with the recipient, or be admin/gosat.';

revoke all on function public.notify_member(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.notify_member(uuid, text, text, text, text, jsonb) to authenticated;
