-- Ensure participants/creators can view messages in their rooms
-- Adds an additional SELECT policy; does not alter existing ones
CREATE POLICY "chat_messages_select_participants"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_messages.room_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id = chat_messages.room_id
      AND cr.created_by = auth.uid()
  )
);
