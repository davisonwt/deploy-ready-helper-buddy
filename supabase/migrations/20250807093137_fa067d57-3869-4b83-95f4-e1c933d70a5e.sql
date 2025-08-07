-- Fix infinite recursion in chat_participants RLS policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON public.chat_participants;

-- Create new policies without circular references
-- Allow users to view participants in rooms they are part of
CREATE POLICY "Users can view room participants" 
ON public.chat_participants 
FOR SELECT 
USING (
  room_id IN (
    SELECT room_id 
    FROM public.chat_participants cp2 
    WHERE cp2.user_id = auth.uid() AND cp2.is_active = true
  )
);

-- Allow users to update their own participation status
CREATE POLICY "Users can update own participation" 
ON public.chat_participants 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow users to insert themselves as participants
CREATE POLICY "Users can join as participants" 
ON public.chat_participants 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own participation
CREATE POLICY "Users can leave as participants" 
ON public.chat_participants 
FOR DELETE 
USING (user_id = auth.uid());