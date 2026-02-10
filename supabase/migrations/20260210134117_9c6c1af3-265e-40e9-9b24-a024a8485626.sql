CREATE OR REPLACE FUNCTION public.get_or_create_direct_room(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_id UUID;
BEGIN
  -- Find existing direct room where both users are participants
  SELECT cr.id INTO room_id
  FROM chat_rooms cr
  WHERE cr.room_type = 'direct'
  AND cr.is_active = true
  AND EXISTS (
    SELECT 1 FROM chat_participants cp1
    WHERE cp1.room_id = cr.id
    AND cp1.user_id = user1_id
    AND cp1.is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM chat_participants cp2
    WHERE cp2.room_id = cr.id
    AND cp2.user_id = user2_id
    AND cp2.is_active = true
  )
  LIMIT 1;

  -- If room exists, return it
  IF room_id IS NOT NULL THEN
    RETURN room_id;
  END IF;

  -- Create new direct room
  INSERT INTO chat_rooms (
    name, room_type, created_by, is_system_room, is_active
  ) VALUES (
    'Direct Chat', 'direct', user1_id, false, true
  )
  RETURNING id INTO room_id;

  -- Add both participants with conflict handling
  INSERT INTO chat_participants (room_id, user_id, is_active)
  VALUES (room_id, user1_id, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true;

  INSERT INTO chat_participants (room_id, user_id, is_active)
  VALUES (room_id, user2_id, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true;

  RETURN room_id;
END;
$$;