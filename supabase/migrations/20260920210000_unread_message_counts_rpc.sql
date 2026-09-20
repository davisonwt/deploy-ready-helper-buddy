-- One number = total messages across all the member's conversations
-- (Global Chat included) arriving after their last-read point, excluding
-- their own -- and the SAME per-room breakdown feeds both the bottom-bar
-- badge (sum) and the conversations list's own per-row indicator, so the
-- two can never disagree (one source, not two independently-written
-- unread queries like DashboardTribeStats.tsx and UnreadInbox.tsx already
-- are).
--
-- No chat presence mechanism exists in this codebase (checked directly --
-- the chat-message notify trigger fires unconditionally, by explicit
-- design, and there is no presence table/channel for chat rooms). Voice/
-- video messages count the same as text -- no message_type filter here,
-- matching how the two existing unread implementations already behave.
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
  WHERE cp.user_id = auth.uid() AND cp.is_active = true
  GROUP BY cp.room_id;
$$;

REVOKE ALL ON FUNCTION public.get_conversation_unread_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_conversation_unread_counts() TO authenticated;
