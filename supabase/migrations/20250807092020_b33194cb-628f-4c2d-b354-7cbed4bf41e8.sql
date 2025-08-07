-- Fix recursive RLS policy issue and remove participant limits
-- Drop the problematic policy first
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;

-- Create a simpler, non-recursive policy for viewing participants
CREATE POLICY "Users can view participants in their rooms" ON chat_participants
FOR SELECT USING (
  room_id IN (
    SELECT room_id FROM chat_participants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Remove max_participants limit by setting it to NULL (unlimited)
ALTER TABLE chat_rooms ALTER COLUMN max_participants DROP NOT NULL;
ALTER TABLE chat_rooms ALTER COLUMN max_participants SET DEFAULT NULL;

-- Update existing rooms to have unlimited participants
UPDATE chat_rooms SET max_participants = NULL;

-- Add direct message support by creating a new room type
ALTER TYPE chat_room_type ADD VALUE IF NOT EXISTS 'direct';

-- Create function to get or create direct message room between two users
CREATE OR REPLACE FUNCTION get_or_create_direct_room(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    room_id UUID;
    room_name TEXT;
BEGIN
    -- Check if a direct room already exists between these users
    SELECT cr.id INTO room_id
    FROM chat_rooms cr
    WHERE cr.room_type = 'direct'
    AND EXISTS (
        SELECT 1 FROM chat_participants cp1 
        WHERE cp1.room_id = cr.id AND cp1.user_id = user1_id AND cp1.is_active = true
    )
    AND EXISTS (
        SELECT 1 FROM chat_participants cp2 
        WHERE cp2.room_id = cr.id AND cp2.user_id = user2_id AND cp2.is_active = true
    )
    AND (
        SELECT COUNT(*) FROM chat_participants cp 
        WHERE cp.room_id = cr.id AND cp.is_active = true
    ) = 2;

    -- If no room exists, create one
    IF room_id IS NULL THEN
        -- Create room name from user profiles
        SELECT CONCAT(
            COALESCE(p1.display_name, p1.first_name, 'User'), 
            ' & ', 
            COALESCE(p2.display_name, p2.first_name, 'User')
        ) INTO room_name
        FROM profiles p1, profiles p2
        WHERE p1.user_id = user1_id AND p2.user_id = user2_id;

        -- Create the room
        INSERT INTO chat_rooms (room_type, name, created_by, max_participants)
        VALUES ('direct', room_name, user1_id, NULL)
        RETURNING id INTO room_id;

        -- Add both users as participants
        INSERT INTO chat_participants (room_id, user_id, is_moderator)
        VALUES 
            (room_id, user1_id, false),
            (room_id, user2_id, false);
    END IF;

    RETURN room_id;
END;
$$;