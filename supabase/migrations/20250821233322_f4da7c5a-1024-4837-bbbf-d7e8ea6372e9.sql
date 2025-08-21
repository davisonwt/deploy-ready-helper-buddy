-- Update the chat_participants INSERT policy to allow inviting other users
DROP POLICY IF EXISTS "Allow users to join rooms" ON public.chat_participants;

-- Allow users to insert their own participation or invite others to rooms they're already in
CREATE POLICY "Allow users to join and invite to rooms" ON public.chat_participants
FOR INSERT 
WITH CHECK (
  -- Users can add themselves
  user_id = auth.uid() 
  OR 
  -- Users can invite others to rooms they're already participating in
  (
    auth.uid() IN (
      SELECT cp.user_id 
      FROM chat_participants cp 
      WHERE cp.room_id = chat_participants.room_id 
      AND cp.is_active = true
    )
  )
);