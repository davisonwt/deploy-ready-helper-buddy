-- Fix: Allow any active participant to see all participants in rooms they belong to
DROP POLICY IF EXISTS "chat_participants_select" ON public.chat_participants;

CREATE POLICY "chat_participants_select" ON public.chat_participants
FOR SELECT USING (
  user_id = auth.uid()
  OR is_room_creator(room_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_participants.room_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
  )
);