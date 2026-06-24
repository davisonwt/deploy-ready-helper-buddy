
CREATE OR REPLACE FUNCTION public.join_live_room_as_self(
  p_room_id uuid,
  p_display_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_creator uuid;
  v_role text;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT created_by INTO v_creator FROM public.live_rooms WHERE id = p_room_id;
  IF v_creator IS NULL THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0002';
  END IF;

  v_role := CASE WHEN v_creator = v_uid THEN 'host' ELSE 'audience' END;
  v_name := COALESCE(NULLIF(trim(p_display_name), ''), 'Member');

  INSERT INTO public.live_room_participants (room_id, user_id, role, display_name)
  VALUES (p_room_id, v_uid, v_role, v_name)
  ON CONFLICT (room_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_live_room_as_self(uuid, text) TO authenticated;
