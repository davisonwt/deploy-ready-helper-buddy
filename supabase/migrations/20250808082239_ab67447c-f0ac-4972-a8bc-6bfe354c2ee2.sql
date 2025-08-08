-- Force refresh of chat_participants policies
-- First completely drop all existing policies
DROP POLICY IF EXISTS "Users can view room participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join as participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave as participants" ON public.chat_participants;

-- Create a security definer function to check if user is in room
CREATE OR REPLACE FUNCTION public.user_is_in_room(check_room_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_participants 
    WHERE room_id = check_room_id 
    AND user_id = check_user_id 
    AND is_active = true
  );
$$;

-- Create new policies using the security definer function
CREATE POLICY "Allow viewing participants in user rooms" 
ON public.chat_participants 
FOR SELECT 
USING (public.user_is_in_room(room_id, auth.uid()));

CREATE POLICY "Allow users to update own participation" 
ON public.chat_participants 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to join rooms" 
ON public.chat_participants 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to leave rooms" 
ON public.chat_participants 
FOR DELETE 
USING (user_id = auth.uid());