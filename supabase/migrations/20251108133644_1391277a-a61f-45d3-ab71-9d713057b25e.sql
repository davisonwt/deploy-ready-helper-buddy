-- Create security definer function to check premium room access
CREATE OR REPLACE FUNCTION public.has_premium_room_access(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.room_id = _room_id
      AND cp.user_id = _user_id
      AND cp.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.id = _room_id
      AND cr.created_by = _user_id
  );
$$;

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can send messages to active rooms" ON chat_messages;

-- Create new policy that allows messages for premium rooms
CREATE POLICY "Users can send messages to their rooms"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  has_premium_room_access(room_id, auth.uid())
);