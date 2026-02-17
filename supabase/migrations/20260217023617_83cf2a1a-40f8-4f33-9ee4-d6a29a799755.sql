
CREATE OR REPLACE FUNCTION public.get_or_create_gosat_room()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_user record;
BEGIN
  -- Find or create the GoSat system room
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE is_system_room = true AND name = 'GoSat HQ'
  LIMIT 1;

  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (name, room_type, is_system_room, created_by, description)
    VALUES ('GoSat HQ', 'group', true, auth.uid(), 'Private GoSat team chat')
    RETURNING id INTO v_room_id;
  END IF;

  -- Sync membership: add all gosat users (NOT admin-only users)
  FOR v_user IN
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'gosat'
  LOOP
    INSERT INTO chat_participants (room_id, user_id, is_active, is_moderator)
    VALUES (v_room_id, v_user.user_id, true, true)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Remove users who lost gosat role
  UPDATE chat_participants
  SET is_active = false
  WHERE room_id = v_room_id
    AND user_id NOT IN (
      SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'gosat'
    )
    AND is_active = true;

  RETURN v_room_id;
END;
$$;
