-- Fix chat_messages RLS policies to be PERMISSIVE (OR logic instead of AND)
-- Drop existing restrictive INSERT policies
DROP POLICY IF EXISTS "Participants can send messages (active)" ON chat_messages;
DROP POLICY IF EXISTS "Room creators can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;

-- Create a single PERMISSIVE policy that allows any of the conditions
CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      -- User is an active participant
      EXISTS (
        SELECT 1 FROM chat_participants
        WHERE chat_participants.room_id = chat_messages.room_id
          AND chat_participants.user_id = auth.uid()
          AND chat_participants.is_active = true
      )
      OR
      -- User is the room creator
      EXISTS (
        SELECT 1 FROM chat_rooms
        WHERE chat_rooms.id = chat_messages.room_id
          AND chat_rooms.created_by = auth.uid()
      )
    )
  );