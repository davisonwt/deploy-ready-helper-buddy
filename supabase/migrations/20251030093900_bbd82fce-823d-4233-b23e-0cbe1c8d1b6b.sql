-- Create secure membership check to avoid policy recursion
CREATE OR REPLACE FUNCTION public.is_member_of_chat(_room_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.chat_participants cp
    where cp.room_id = _room_id
      and cp.user_id = _user_id
      and cp.is_active = true
  );
$$;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Replace chat_rooms policy to use function
DROP POLICY IF EXISTS "Members can view their rooms" ON public.chat_rooms;
CREATE POLICY "Members can view their rooms"
ON public.chat_rooms
FOR SELECT
USING (public.is_member_of_chat(chat_rooms.id, auth.uid()));

-- Replace chat_participants policy to avoid recursion
DROP POLICY IF EXISTS "Members can view participants of their rooms" ON public.chat_participants;
CREATE POLICY "Members can view participants of their rooms"
ON public.chat_participants
FOR SELECT
USING (public.is_member_of_chat(chat_participants.room_id, auth.uid()));