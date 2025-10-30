-- COMPREHENSIVE CHAT SYSTEM FIX: Clean slate and rebuild
-- Phase 1: Clean Slate - Drop ALL existing RLS policies

-- Drop all chat_rooms policies
DROP POLICY IF EXISTS "Members can view their rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view their chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view rooms they created" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;
DROP POLICY IF EXISTS "Premium room access based on bestowals" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admins can view all rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view public rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update rooms they created" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can delete rooms they created" ON public.chat_rooms;
DROP POLICY IF EXISTS "Creators can update their rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Creators can delete their rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admins can manage all rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Room creators can manage their rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admin access to all chat rooms" ON public.chat_rooms;

-- Drop all chat_participants policies  
DROP POLICY IF EXISTS "Members can view participants of their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants of rooms they're in" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can manage their own participation" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Admins can manage all participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Room creators can manage participants" ON public.chat_participants;

-- Ensure RLS is enabled
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Phase 2: Rebuild with minimal, non-conflicting policies

-- CHAT_ROOMS: Only 4 policies needed

-- 1. SELECT: Users see rooms where they are creator OR active participant OR admins
CREATE POLICY "chat_rooms_select" 
ON public.chat_rooms 
FOR SELECT 
USING (
  created_by = auth.uid() OR
  public.is_member_of_chat(id, auth.uid()) OR
  public.is_admin_or_gosat(auth.uid())
);

-- 2. INSERT: Authenticated users can create rooms
CREATE POLICY "chat_rooms_insert" 
ON public.chat_rooms 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  created_by = auth.uid()
);

-- 3. UPDATE: Creators and admins can update
CREATE POLICY "chat_rooms_update" 
ON public.chat_rooms 
FOR UPDATE 
USING (
  created_by = auth.uid() OR
  public.is_admin_or_gosat(auth.uid())
);

-- 4. DELETE: Creators and admins can delete
CREATE POLICY "chat_rooms_delete" 
ON public.chat_rooms 
FOR DELETE 
USING (
  created_by = auth.uid() OR
  public.is_admin_or_gosat(auth.uid())
);

-- CHAT_PARTICIPANTS: Only 4 policies needed

-- 1. SELECT: View participants if you're a member of that room OR admin
CREATE POLICY "chat_participants_select" 
ON public.chat_participants 
FOR SELECT 
USING (
  public.is_member_of_chat(room_id, auth.uid()) OR
  public.is_admin_or_gosat(auth.uid())
);

-- 2. INSERT: Join if you're the user being added AND (creator invites OR self-join to non-premium)
CREATE POLICY "chat_participants_insert" 
ON public.chat_participants 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  user_id = auth.uid() AND
  (
    -- Room creator can add anyone
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid()) OR
    -- Users can join non-premium rooms
    EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND is_premium = false) OR
    -- Admins can add anyone
    public.is_admin_or_gosat(auth.uid())
  )
);

-- 3. UPDATE: Update your own participation status OR creator/admin can update
CREATE POLICY "chat_participants_update" 
ON public.chat_participants 
FOR UPDATE 
USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid()) OR
  public.is_admin_or_gosat(auth.uid())
);

-- 4. DELETE: Leave rooms you're in OR creator/admin can remove
CREATE POLICY "chat_participants_delete" 
ON public.chat_participants 
FOR DELETE 
USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.chat_rooms WHERE id = room_id AND created_by = auth.uid()) OR
  public.is_admin_or_gosat(auth.uid())
);

-- Ensure the helper function exists and is correct
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

-- Test the policies work correctly
DO $$
BEGIN
  RAISE NOTICE 'Chat RLS policies rebuilt successfully. Total policies: chat_rooms=4, chat_participants=4';
END $$;