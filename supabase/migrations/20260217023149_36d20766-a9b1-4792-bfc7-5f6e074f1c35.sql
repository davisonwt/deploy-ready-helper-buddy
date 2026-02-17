
-- Create a function to get or create the GoSat admin group chat room
-- Automatically adds ALL users with 'gosat' or 'admin' roles
CREATE OR REPLACE FUNCTION public.get_or_create_gosat_room()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id uuid;
  v_user_id uuid := auth.uid();
  v_has_role boolean;
BEGIN
  -- Verify caller has gosat or admin role
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_user_id AND role IN ('gosat', 'admin')
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RAISE EXCEPTION 'Access denied: GoSat or Admin role required';
  END IF;

  -- Check if the GoSat room already exists
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE name = 'GoSat HQ'
    AND is_system_room = true
    AND is_active = true
  LIMIT 1;

  -- If not, create it
  IF v_room_id IS NULL THEN
    INSERT INTO chat_rooms (name, room_type, is_system_room, is_active, description, created_by)
    VALUES ('GoSat HQ', 'group', true, true, 'Private GoSat admin group chat. Messaging, calls, file sharing, and S2G balance overview.', v_user_id)
    RETURNING id INTO v_room_id;
  END IF;

  -- Ensure ALL gosat/admin users are participants
  INSERT INTO chat_participants (room_id, user_id, is_active, is_moderator)
  SELECT v_room_id, ur.user_id, true, true
  FROM user_roles ur
  WHERE ur.role IN ('gosat', 'admin')
  GROUP BY ur.user_id
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true, is_moderator = true;

  RETURN v_room_id;
END;
$$;
