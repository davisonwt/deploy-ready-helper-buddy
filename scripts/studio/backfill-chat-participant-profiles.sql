-- ONE-OFF backfill: fill chat_participants.profile_id from user_id.
--
-- No writer ever set this column, so direct rooms had no counterpart
-- profile to name themselves after and rendered as "Chat" with no avatar.
-- Migration 20260916190000 stops new rows being written that way. This
-- repairs every existing row.
--
-- Run the migration FIRST, then this. Safe to re-run: it only ever fills
-- a null, and never overwrites a profile_id that is already set.
--
-- Counts measured 2026-09-16 before running:
--   chat_participants rows total ........................ 133
--   profile_id IS NULL .................................. 131   <- this many change
--   ...of those, a matching profile exists .............. 131   (all of them)
--   ...of those, NO matching profile (cannot fix) ....... 0
--   distinct direct rooms affected ...................... 116

-- --- BEFORE -----------------------------------------------------------------
select
  'BEFORE' as stage,
  count(*)                                    as rows_total,
  count(*) filter (where profile_id is null)  as profile_id_null,
  count(*) filter (where profile_id is not null) as profile_id_set
from public.chat_participants;

-- --- THE BACKFILL -----------------------------------------------------------
-- WHERE clause is mandatory: the PostgREST role preloads safeupdate, and a
-- bare UPDATE is refused. It is also what makes this re-runnable.
update public.chat_participants cp
set    profile_id = p.id
from   public.profiles p
where  p.user_id = cp.user_id
  and  cp.profile_id is null;

-- --- AFTER ------------------------------------------------------------------
select
  'AFTER' as stage,
  count(*)                                    as rows_total,
  count(*) filter (where profile_id is null)  as profile_id_null,
  count(*) filter (where profile_id is not null) as profile_id_set
from public.chat_participants;

-- --- ANYTHING STILL UNFIXABLE ----------------------------------------------
-- Expected: zero rows. A row here has no profiles entry for its user_id,
-- so there is nothing to point at. It is reported, never invented.
select
  cp.id            as participant_id,
  cp.room_id,
  cp.user_id,
  r.room_type
from public.chat_participants cp
left join public.chat_rooms r on r.id = cp.room_id
where cp.profile_id is null;

-- --- PROOF: the direct rooms can now be named -------------------------------
-- One row per direct room, showing the counterpart each viewer would see.
select
  r.id                    as room_id,
  r.name                  as stored_room_name,
  cp.user_id              as viewer,
  other.user_id           as counterpart,
  op.display_name         as counterpart_name,
  (op.avatar_url is not null) as counterpart_has_avatar
from public.chat_rooms r
join public.chat_participants cp    on cp.room_id = r.id and cp.is_active
join public.chat_participants other on other.room_id = r.id
                                   and other.user_id <> cp.user_id
                                   and other.is_active
left join public.profiles op on op.id = other.profile_id
where r.room_type = 'direct'
  and r.is_active
order by r.id
limit 40;
