-- Update RLS policy to allow room creators to add initial participants
DROP POLICY IF EXISTS "Allow users to join and invite to rooms" ON public.chat_participants;

CREATE POLICY "Allow users to join and invite to rooms" 
ON public.chat_participants 
FOR INSERT 
WITH CHECK (
  -- Users can add themselves
  (user_id = auth.uid()) OR 
  -- Existing participants can invite others
  (auth.uid() IN (
    SELECT cp.user_id 
    FROM chat_participants cp 
    WHERE cp.room_id = chat_participants.room_id 
    AND cp.is_active = true
  )) OR
  -- Room creators can add initial participants (moderators)
  (auth.uid() IN (
    SELECT cr.created_by 
    FROM chat_rooms cr 
    WHERE cr.id = chat_participants.room_id
  ))
);