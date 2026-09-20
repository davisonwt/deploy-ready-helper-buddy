-- Deleted messages must not count as unread. get_conversation_unread_counts
-- (20260920210000) had no deleted_at reference at all -- a soft-deleted
-- message (delete-chat-message sets deleted_at via UPDATE, content stays
-- but is display-hidden) still inflated the badge/list count. Same return
-- shape, no DROP needed.
CREATE OR REPLACE FUNCTION public.get_conversation_unread_counts()
RETURNS TABLE(room_id uuid, unread_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT cp.room_id, COUNT(cm.id)::integer AS unread_count
  FROM public.chat_participants cp
  JOIN public.chat_messages cm
    ON cm.room_id = cp.room_id
    AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz)
    AND (cm.sender_id IS NULL OR cm.sender_id <> auth.uid())
    AND cm.deleted_at IS NULL
  WHERE cp.user_id = auth.uid() AND cp.is_active = true
  GROUP BY cp.room_id;
$$;
