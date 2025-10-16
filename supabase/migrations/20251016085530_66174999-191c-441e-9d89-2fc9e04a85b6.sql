-- Fix chat_messages RLS - single PERMISSIVE policy for sending messages
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Participants can send messages (active)" ON chat_messages;
DROP POLICY IF EXISTS "Room creators can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to active rooms" ON chat_messages;

-- PERMISSIVE policy (default) - any condition can allow access
CREATE POLICY "Users can send messages to active rooms" ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM chat_participants cp
        WHERE cp.room_id = chat_messages.room_id
          AND cp.user_id = auth.uid()
          AND cp.is_active = true
      )
      OR
      EXISTS (
        SELECT 1 FROM chat_rooms cr
        WHERE cr.id = chat_messages.room_id
          AND cr.created_by = auth.uid()
      )
    )
  );