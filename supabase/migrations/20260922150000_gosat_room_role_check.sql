-- get_or_create_gosat_room() refuses non-gosat callers.
--
-- ALREADY APPLIED on 2026-09-22 via the Management API; this file records
-- it, because this project's migration ledger is drifted.
--
-- Found by the gosat visibility audit. The function is SECURITY DEFINER
-- and checked only that the caller was signed in. A plain member
-- (davisontest1, no roles) called it and it created the "GoSat HQ" room
-- -- described in the function itself as "Private GoSat team chat" --
-- with created_by set to that member. Two ordinary policies then read
-- off that column:
--
--   chat_rooms_select        : created_by = auth.uid() OR is_member_of_chat(...)
--   chat_participants_select : ... OR is_room_creator(room_id, auth.uid()) ...
--
-- so the caller could read the private room's row and enumerate the full
-- gosat roster -- which user_roles itself correctly refuses to disclose.
-- Message bodies stayed out of reach: chat_messages requires
-- cp.is_active = true, and this function deactivates non-gosat
-- participants in the same call.
--
-- Guarded on gosat specifically, NOT is_admin_or_gosat as most siblings
-- use. This function's own membership sync is gosat-only and says so
-- ("add all gosat users (NOT admin-only users)"), and its final step
-- deactivates everyone without the gosat role. Admitting admin-only
-- callers would let one create the room and become its created_by while
-- being deactivated from it a few statements later -- the same defect,
-- one role narrower. The RAISE shape matches the siblings.
--
-- Body is otherwise unchanged from the deployed version.
CREATE OR REPLACE FUNCTION public.get_or_create_gosat_room()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_room_id uuid;
  v_user record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'gosat') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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
$function$;
