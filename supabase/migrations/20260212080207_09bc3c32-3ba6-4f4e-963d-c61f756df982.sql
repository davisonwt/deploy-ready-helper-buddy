
-- Create a function to get or create the global S2G community chat room
-- All registered users are automatically added as participants
CREATE OR REPLACE FUNCTION public.get_or_create_community_room()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- Check if the global community room already exists
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE name = 'S2G Community'
    AND is_system_room = true
    AND is_active = true
  LIMIT 1;

  -- If not, create it
  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (name, room_type, is_system_room, is_active, description, created_by)
    VALUES ('S2G Community', 'group', true, true, 'The official S2G community chat. Share, market, chat with the whole community!', v_user_id)
    RETURNING id INTO v_room_id;
  END IF;

  -- Ensure the current user is a participant
  INSERT INTO chat_participants (room_id, user_id, is_active)
  VALUES (v_room_id, v_user_id, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true;

  RETURN v_room_id;
END;
$$;
