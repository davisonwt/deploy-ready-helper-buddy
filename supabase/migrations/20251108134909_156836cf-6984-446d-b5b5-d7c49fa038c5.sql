-- Drop the existing policy that uses the problematic function
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;

-- Create a simpler policy that directly checks room access
CREATE POLICY "Users can send messages to their rooms"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND (
    -- Check if user is a chat participant
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = chat_messages.room_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = true
    ) OR
    -- Check if user is the room creator
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_messages.room_id
        AND cr.created_by = auth.uid()
    )
  )
);