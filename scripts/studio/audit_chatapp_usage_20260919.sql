-- AUDIT, READ ONLY -- what of ChatApp is actually used? 2026-09-19.
-- Nothing here writes, updates or deletes.
--
-- The point: something nobody has ever used is a candidate for removal, not
-- redesign. Each query reports rows AND distinct real members, because a
-- table with 40 rows all created by the gosat is an empty feature.
--
--   node scripts/studio/run-sql-file.mjs scripts/studio/audit_chatapp_usage_20260919.sql

-- 1. ROOMS BY KIND. chat_rooms is the substrate under Community Chat,
--    Classroom, SkillDrop and Training, so the split matters more than the
--    total.
select room_type, room_type_detailed, is_system_room, is_premium,
       count(*) as rooms,
       count(distinct created_by) as distinct_creators,
       min(created_at) as first, max(created_at) as last
  from public.chat_rooms
 group by room_type, room_type_detailed, is_system_room, is_premium
 order by rooms desc;

-- 2. MESSAGES, and how many rooms ever got a SECOND message. A room with
--    one message was opened and abandoned.
select count(*) as messages,
       count(distinct room_id) as rooms_with_any_message,
       count(distinct sender_id) as distinct_senders,
       min(created_at) as first, max(created_at) as last
  from public.chat_messages;

select msgs, count(*) as rooms
  from (select room_id, count(*) as msgs from public.chat_messages group by room_id) t
 group by msgs order by msgs;

-- 3. Messages per room kind -- joins the substrate question to real traffic.
select r.room_type, r.room_type_detailed,
       count(m.id) as messages, count(distinct m.sender_id) as senders,
       count(distinct r.id) as rooms
  from public.chat_rooms r
  left join public.chat_messages m on m.room_id = r.id
 group by r.room_type, r.room_type_detailed
 order by messages desc;

-- 4. THE 205 INVISIBLE DIRECT MESSAGES. ChatApp.tsx:177 says the
--    room_type='direct' flow was removed, so these rooms exist and are
--    unreachable from the main surface. How many, and are they still
--    growing?
select count(distinct r.id) as direct_rooms,
       count(m.id) as direct_messages,
       count(distinct m.sender_id) as members_who_sent,
       max(m.created_at) as most_recent_message
  from public.chat_rooms r
  left join public.chat_messages m on m.room_id = r.id
 where r.room_type::text = 'direct' or r.room_type_detailed::text = 'direct';

-- 5. CIRCLES -- and which of the two membership tables is real.
select 'circles' as t, count(*) as rows, null::bigint as distinct_members from public.circles
union all select 'user_circles', count(*), count(distinct user_id) from public.user_circles
union all select 'circle_members', count(*), count(distinct user_id) from public.circle_members;

-- 6. CLASSROOM vs SKILLDROP -- two tables, near-identical shape.
select 'classroom' as kind, count(*) as sessions,
       count(distinct instructor_id) as distinct_hosts,
       count(*) filter (where ended_at is not null) as completed,
       min(created_at) as first, max(created_at) as last
  from public.classroom_sessions
union all
select 'skilldrop', count(*), count(distinct presenter_id),
       count(*) filter (where scheduled_at < now()),
       min(created_at), max(created_at)
  from public.skilldrop_sessions;

-- 7. THE OTHER ROOMS.
select 'live_rooms' as t, count(*) as rows, count(distinct created_by) as creators from public.live_rooms
union all select 'premium_rooms', count(*), count(distinct creator_id) from public.premium_rooms
union all select 'gathering_sessions', count(*), count(distinct host_id) from public.gathering_sessions;

-- 8. HOW MANY MEMBERS TOUCHED CHAT AT ALL, against the member count. This
--    is the number that decides whether ChatApp is a feature or a room
--    nobody walks into.
select
  (select count(*) from auth.users)                              as total_members,
  (select count(distinct sender_id) from public.chat_messages)   as ever_sent_a_message,
  (select count(distinct user_id) from public.chat_participants) as ever_joined_a_room;
