-- Fix RLS so members can read their direct chats reliably (idempotent)
-- 1) Ensure RLS is enabled
ALTER TABLE IF EXISTS public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_participants ENABLE ROW LEVEL SECURITY;

-- 2) Allow members to SELECT their rooms (including direct)
DROP POLICY IF EXISTS "Members can view their rooms" ON public.chat_rooms;
CREATE POLICY "Members can view their rooms"
ON public.chat_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_rooms.id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
  )
);

-- 3) Allow members to SELECT participants of their rooms (for counts and avatars)
DROP POLICY IF EXISTS "Members can view participants of their rooms" ON public.chat_participants;
CREATE POLICY "Members can view participants of their rooms"
ON public.chat_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.room_id = chat_participants.room_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
  )
);

-- Note: Existing discovery policies for public/group rooms remain unchanged.