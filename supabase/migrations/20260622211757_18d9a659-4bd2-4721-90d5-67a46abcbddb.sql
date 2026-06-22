
-- 1) Security definer helper for live_room participation
CREATE OR REPLACE FUNCTION public.is_live_room_participant(_room uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_room_participants
    WHERE room_id = _room AND user_id = _user
  );
$$;

-- 2) Rewrite RLS on live_rooms
DROP POLICY IF EXISTS "Anyone can view active live rooms" ON public.live_rooms;
CREATE POLICY "Participants can view their live rooms"
ON public.live_rooms FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_live_room_participant(id, auth.uid())
);

-- 3) Rewrite RLS on live_room_participants
DROP POLICY IF EXISTS "Anyone can view participants" ON public.live_room_participants;
DROP POLICY IF EXISTS "Authenticated users can join rooms" ON public.live_room_participants;

CREATE POLICY "Participants can view co-participants"
ON public.live_room_participants FOR SELECT
TO authenticated
USING (public.is_live_room_participant(room_id, auth.uid()));

CREATE POLICY "Room creator can add participants"
ON public.live_room_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.live_rooms r
    WHERE r.id = room_id AND r.created_by = auth.uid()
  )
  OR auth.uid() = user_id
);

-- 4) New table: live_room_messages
CREATE TABLE public.live_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('text','voice','video')),
  content text,
  media_url text,
  media_duration_seconds integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_room_messages TO authenticated;
GRANT ALL ON public.live_room_messages TO service_role;

ALTER TABLE public.live_room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read messages"
ON public.live_room_messages FOR SELECT
TO authenticated
USING (public.is_live_room_participant(room_id, auth.uid()));

CREATE POLICY "Participants can send messages"
ON public.live_room_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_live_room_participant(room_id, auth.uid())
);

CREATE POLICY "Senders can delete their own messages"
ON public.live_room_messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid());

CREATE INDEX live_room_messages_room_created_idx
  ON public.live_room_messages (room_id, created_at);

ALTER TABLE public.live_room_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_room_messages;

-- 5) Storage RLS for chat-media (bucket created via tool)
CREATE POLICY "Participants can read chat-media files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND public.is_live_room_participant(
    NULLIF((storage.foldername(name))[1], '')::uuid,
    auth.uid()
  )
);

CREATE POLICY "Participants can upload chat-media files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND public.is_live_room_participant(
    NULLIF((storage.foldername(name))[1], '')::uuid,
    auth.uid()
  )
);
