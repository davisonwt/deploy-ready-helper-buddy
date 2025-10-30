-- Narrow chat visibility: avoid leaking all rooms to admins/gosats in user views
-- Replace SELECT policies to only show rooms a user created or participates in
DO $$
BEGIN
  -- Drop existing select policies to replace
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_rooms' AND policyname='chat_rooms_select'
  ) THEN
    EXECUTE 'DROP POLICY chat_rooms_select ON public.chat_rooms';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='chat_participants' AND policyname='chat_participants_select'
  ) THEN
    EXECUTE 'DROP POLICY chat_participants_select ON public.chat_participants';
  END IF;
END$$;

-- Recreate tighter SELECT policies
CREATE POLICY chat_rooms_select ON public.chat_rooms
FOR SELECT
USING (
  created_by = auth.uid() OR public.is_member_of_chat(id, auth.uid())
);

CREATE POLICY chat_participants_select ON public.chat_participants
FOR SELECT
USING (
  user_id = auth.uid() OR public.is_room_creator(room_id, auth.uid())
);

-- Keep UPDATE/DELETE/INSERT policies as-is
