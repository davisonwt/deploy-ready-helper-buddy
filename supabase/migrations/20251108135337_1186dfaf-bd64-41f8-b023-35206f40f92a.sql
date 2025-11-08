-- Drop existing restrictive policies on chat_messages
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select_participants" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;

-- Temporarily allow authenticated users to insert messages in premium rooms
-- This checks if the room_id exists in the chat_rooms table linked to premium_rooms
CREATE POLICY "Allow inserts for authenticated users in premium rooms"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.id = chat_messages.room_id
      AND cr.is_premium = true
  )
);

-- Temporarily allow authenticated users to read messages from premium rooms
CREATE POLICY "Allow selects for authenticated users in premium rooms"
ON chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.id = chat_messages.room_id
      AND cr.is_premium = true
  )
);

-- Keep the existing policies for non-premium rooms
CREATE POLICY "Users can send messages to non-premium rooms"
ON chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.id = chat_messages.room_id
      AND (cr.is_premium = false OR cr.is_premium IS NULL)
      AND (
        EXISTS (
          SELECT 1 FROM chat_participants cp
          WHERE cp.room_id = chat_messages.room_id
            AND cp.user_id = auth.uid()
            AND cp.is_active = true
        ) OR
        cr.created_by = auth.uid()
      )
  )
);

CREATE POLICY "Users can view messages in non-premium rooms"
ON chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.id = chat_messages.room_id
      AND (cr.is_premium = false OR cr.is_premium IS NULL)
      AND (
        EXISTS (
          SELECT 1 FROM chat_participants cp
          WHERE cp.room_id = chat_messages.room_id
            AND cp.user_id = auth.uid()
            AND cp.is_active = true
        ) OR
        cr.created_by = auth.uid()
      )
  )
);