-- Create a secure function to delete a chat room and its related data atomically
-- Allows the room creator or admins (admin/gosat) to perform the deletion
CREATE OR REPLACE FUNCTION public.admin_delete_room(target_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator uuid;
BEGIN
  -- Validate room exists and fetch creator
  SELECT created_by INTO v_creator
  FROM public.chat_rooms
  WHERE id = target_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Permission check: room creator or admin/gosat only
  IF NOT (auth.uid() = v_creator OR is_admin_or_gosat(auth.uid())) THEN
    RAISE EXCEPTION 'Insufficient permissions to delete this room' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Delete dependent data first (bypass RLS via SECURITY DEFINER)
  DELETE FROM public.chat_messages WHERE room_id = target_room_id;
  DELETE FROM public.chat_files WHERE room_id = target_room_id;
  DELETE FROM public.chat_room_documents WHERE room_id = target_room_id;
  DELETE FROM public.chat_participants WHERE room_id = target_room_id;

  -- Finally delete the room
  DELETE FROM public.chat_rooms WHERE id = target_room_id;

  RETURN TRUE;
END;
$$;

-- Ensure authenticated users can execute the function
GRANT EXECUTE ON FUNCTION public.admin_delete_room(uuid) TO authenticated;