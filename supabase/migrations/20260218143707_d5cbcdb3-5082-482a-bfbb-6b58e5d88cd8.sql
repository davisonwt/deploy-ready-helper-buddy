-- Fix infinite recursion: use a security definer function instead
CREATE OR REPLACE FUNCTION public.is_participant_in_room(p_room_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = p_room_id
      AND user_id = p_user_id
      AND is_active = true
  );
$$;

-- Replace the broken recursive policy
DROP POLICY IF EXISTS "chat_participants_select" ON public.chat_participants;

CREATE POLICY "chat_participants_select" ON public.chat_participants
FOR SELECT USING (
  user_id = auth.uid()
  OR is_room_creator(room_id, auth.uid())
  OR is_participant_in_room(room_id, auth.uid())
);