-- Fix 1: Drop FK constraint so comments work on all content types (products, books, music, orchards)
ALTER TABLE public.memry_comments DROP CONSTRAINT IF EXISTS memry_comments_post_id_fkey;

-- Fix 2: Fix ambiguous room_id in get_or_create_direct_room
CREATE OR REPLACE FUNCTION public.get_or_create_direct_room(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- Find existing direct room where both users are participants
  SELECT cr.id INTO v_room_id
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

  IF v_room_id IS NOT NULL THEN
    RETURN v_room_id;
  END IF;

  -- Create new direct room
  INSERT INTO chat_rooms (name, room_type, created_by, is_system_room, is_active)
  VALUES ('Direct Chat', 'direct', user1_id, false, true)
  RETURNING id INTO v_room_id;

  -- Add both participants with conflict handling
  INSERT INTO chat_participants (room_id, user_id, is_active)
  VALUES (v_room_id, user1_id, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true;

  INSERT INTO chat_participants (room_id, user_id, is_active)
  VALUES (v_room_id, user2_id, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true;

  RETURN v_room_id;
END;
$$;