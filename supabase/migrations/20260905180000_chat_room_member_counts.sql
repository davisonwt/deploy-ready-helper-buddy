-- Public Rooms member count, correct for every viewer (2026-09-05).
--
-- chat_participants' SELECT policy shows a non-creator only their own row,
-- so any client-side count (an embedded `chat_participants(count)`, or the
-- length of the embedded rows) is a lower bound for everyone but the
-- creator. chat_rooms carries no cached count and no trigger maintains
-- one (update_room_participant_count() belongs to live_rooms). This
-- function counts as its owner, for the room ids the caller passes, and
-- only for signed-in callers. A member count per room id discloses
-- nothing about who the members are.

CREATE OR REPLACE FUNCTION public.chat_room_member_counts(_room_ids uuid[])
RETURNS TABLE(room_id uuid, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.room_id, count(*)::bigint AS member_count
  FROM public.chat_participants cp
  JOIN public.chat_rooms r ON r.id = cp.room_id
  WHERE auth.uid() IS NOT NULL
    AND cp.room_id = ANY(COALESCE(_room_ids, ARRAY[]::uuid[]))
    AND cp.is_active = true
    AND r.is_active = true
  GROUP BY cp.room_id;
$$;

REVOKE ALL ON FUNCTION public.chat_room_member_counts(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chat_room_member_counts(uuid[]) TO authenticated, service_role;

COMMENT ON FUNCTION public.chat_room_member_counts(uuid[]) IS
  'Active-member count per chat room for the given ids, computed as owner so RLS on chat_participants (own row only for non-creators) does not understate it. Signed-in callers only.';

-- Proof (run as postgres in Studio): every active public room with its
-- true count, next to what a non-creator member would see through RLS.
-- The Davi room should show member_count = 2.
SELECT r.name, c.member_count
FROM public.chat_rooms r
JOIN public.chat_room_member_counts(ARRAY(SELECT id FROM public.chat_rooms WHERE is_active)) c ON c.room_id = r.id
WHERE r.is_premium = false
ORDER BY r.created_at DESC
LIMIT 10;
