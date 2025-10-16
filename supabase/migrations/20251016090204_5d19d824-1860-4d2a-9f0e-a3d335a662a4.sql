-- Create SECURITY DEFINER helpers to avoid cross-table RLS in chat_messages policy
CREATE OR REPLACE FUNCTION public.is_active_participant(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = _room_id AND user_id = _user_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_creator(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_rooms
    WHERE id = _room_id AND created_by = _user_id
  );
$$;

-- Replace INSERT policy to use helper functions
DROP POLICY IF EXISTS "Users can send messages to active rooms" ON public.chat_messages;

CREATE POLICY "Users can send messages to active rooms" ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND (
    public.is_active_participant(room_id, auth.uid()) OR
    public.is_room_creator(room_id, auth.uid())
  )
);
