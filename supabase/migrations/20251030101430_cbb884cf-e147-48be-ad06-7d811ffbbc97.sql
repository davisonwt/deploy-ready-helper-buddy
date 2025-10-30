-- Clean up conflicting RLS and enforce correct visibility for chats
-- 1) Drop ALL existing policies on chat tables (clean slate)
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('chat_rooms','chat_participants')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- 2) Ensure RLS is enabled
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- 3) Helper function to check moderator status without causing recursion
CREATE OR REPLACE FUNCTION public.is_moderator_in_room(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = _room_id
      AND user_id = _user_id
      AND is_active = true
      AND COALESCE(is_moderator, false) = true
  );
$$;

-- 4) Minimal, non-overlapping policies
-- chat_rooms
CREATE POLICY chat_rooms_select ON public.chat_rooms
FOR SELECT
USING (
  -- Creator can see
  created_by = auth.uid()
  -- Any active participant can see
  OR public.is_member_of_chat(id, auth.uid())
  -- Admins/Gosats can see
  OR public.is_admin_or_gosat(auth.uid())
);

CREATE POLICY chat_rooms_insert ON public.chat_rooms
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
);

CREATE POLICY chat_rooms_update ON public.chat_rooms
FOR UPDATE
USING (
  created_by = auth.uid() OR public.is_admin_or_gosat(auth.uid())
)
WITH CHECK (
  created_by = auth.uid() OR public.is_admin_or_gosat(auth.uid())
);

CREATE POLICY chat_rooms_delete ON public.chat_rooms
FOR DELETE
USING (
  created_by = auth.uid() OR public.is_admin_or_gosat(auth.uid())
);

-- chat_participants
CREATE POLICY chat_participants_select ON public.chat_participants
FOR SELECT
USING (
  -- You can see your own participation rows
  user_id = auth.uid()
  -- Room creator can see all participants
  OR public.is_room_creator(room_id, auth.uid())
  -- Admins/Gosats can see all participants
  OR public.is_admin_or_gosat(auth.uid())
);

-- Only room creator, an active moderator, or admins/gosats can add participants
CREATE POLICY chat_participants_insert_controlled ON public.chat_participants
FOR INSERT
WITH CHECK (
  public.is_room_creator(room_id, auth.uid())
  OR public.is_moderator_in_room(room_id, auth.uid())
  OR public.is_admin_or_gosat(auth.uid())
);

-- Users can update their own row; creator/moderator/admin can update any
CREATE POLICY chat_participants_update ON public.chat_participants
FOR UPDATE
USING (
  user_id = auth.uid()
  OR public.is_room_creator(room_id, auth.uid())
  OR public.is_moderator_in_room(room_id, auth.uid())
  OR public.is_admin_or_gosat(auth.uid())
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_room_creator(room_id, auth.uid())
  OR public.is_moderator_in_room(room_id, auth.uid())
  OR public.is_admin_or_gosat(auth.uid())
);

-- Users can leave (delete their own row); creator/moderator/admin can delete any
CREATE POLICY chat_participants_delete ON public.chat_participants
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.is_room_creator(room_id, auth.uid())
  OR public.is_moderator_in_room(room_id, auth.uid())
  OR public.is_admin_or_gosat(auth.uid())
);

-- 5) Optional hardening: ensure tables are part of realtime publication (no-op if already added)
-- COMMENT: Lovable handles realtime without manual publication changes.
