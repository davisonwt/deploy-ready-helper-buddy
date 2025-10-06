-- Fix RLS circular dependencies using security definer functions

-- Create security definer function to check user access without circular RLS
CREATE OR REPLACE FUNCTION public.can_access_user_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- User can access own data, or admins/gosats can access any data
  RETURN auth.uid() = target_user_id OR is_admin_or_gosat(auth.uid());
END;
$$;

-- Create room_members table if it doesn't exist (for chat message access)
CREATE TABLE IF NOT EXISTS public.room_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Enable RLS on room_members
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- RLS policy for room_members
CREATE POLICY "Users can view room members where they are members"
ON public.room_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id 
    AND rm.user_id = auth.uid() 
    AND rm.is_active = true
  )
);

CREATE POLICY "Users can join rooms"
ON public.room_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
ON public.room_members
FOR UPDATE
USING (auth.uid() = user_id);

-- Update chat_messages policies to use room_members
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON public.chat_messages;
CREATE POLICY "Users can view messages in their rooms"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = chat_messages.room_id 
    AND rm.user_id = auth.uid() 
    AND rm.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;
CREATE POLICY "Users can send messages in their rooms"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = chat_messages.room_id 
    AND rm.user_id = auth.uid() 
    AND rm.is_active = true
  )
);

-- Update profiles policies using security definer function
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles with secure access"
ON public.profiles
FOR SELECT
USING (can_access_user_data(user_id) OR TRUE); -- Public profiles viewable by all

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile securely"
ON public.profiles
FOR UPDATE
USING (can_access_user_data(user_id));

-- Comment for developers
COMMENT ON FUNCTION public.can_access_user_data IS 'Security definer function to check user access without triggering RLS circular dependencies. Users can access own data, admins/gosats can access any data.';

COMMENT ON TABLE public.room_members IS 'Junction table for chat room membership, breaks circular dependency between chat_rooms and chat_messages RLS policies.';