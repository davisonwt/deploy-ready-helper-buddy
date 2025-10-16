-- Secure RPC to send chat messages bypassing RLS while enforcing membership
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_room_id uuid,
  p_content text DEFAULT NULL,
  p_message_type text DEFAULT 'text',
  p_file_url text DEFAULT NULL,
  p_file_name text DEFAULT NULL,
  p_file_type public.file_type DEFAULT NULL,
  p_file_size integer DEFAULT NULL
)
RETURNS public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg public.chat_messages;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.is_active_participant(p_room_id, auth.uid()) OR public.is_room_creator(p_room_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not allowed to send to this room' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.chat_messages (
    room_id, sender_id, content, message_type, file_url, file_name, file_type, file_size
  ) VALUES (
    p_room_id, auth.uid(), p_content, COALESCE(p_message_type, 'text'), p_file_url, p_file_name, p_file_type, p_file_size
  )
  RETURNING * INTO v_msg;

  RETURN v_msg;
END;
$$;

-- Ensure authenticated users can execute
REVOKE ALL ON FUNCTION public.send_chat_message(uuid, text, text, text, text, public.file_type, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid, text, text, text, text, public.file_type, integer) TO authenticated;