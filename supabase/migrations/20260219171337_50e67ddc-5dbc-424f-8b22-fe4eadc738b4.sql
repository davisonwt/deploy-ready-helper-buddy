-- Create a SECURITY DEFINER function to add participants to a room
-- Only the room creator can call this (enforced in the function)
CREATE OR REPLACE FUNCTION public.add_room_participants(
  _room_id UUID,
  _user_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id UUID := auth.uid();
  _uid UUID;
BEGIN
  -- Verify the caller is the room creator or a moderator
  IF NOT EXISTS (
    SELECT 1 FROM chat_rooms WHERE id = _room_id AND created_by = _caller_id
  ) AND NOT EXISTS (
    SELECT 1 FROM chat_participants WHERE room_id = _room_id AND user_id = _caller_id AND is_moderator = true AND is_active = true
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = _caller_id AND role IN ('admin', 'gosat')
  ) THEN
    RAISE EXCEPTION 'Not authorized to add participants to this room';
  END IF;

  -- Insert participants, skipping duplicates
  FOREACH _uid IN ARRAY _user_ids
  LOOP
    INSERT INTO chat_participants (room_id, user_id, is_active, is_moderator)
    VALUES (_room_id, _uid, true, false)
    ON CONFLICT (room_id, user_id) 
    DO UPDATE SET is_active = true;
  END LOOP;
END;
$$;