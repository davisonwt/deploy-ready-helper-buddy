-- The chat-media bucket's INSERT/SELECT storage policies call
-- is_live_room_participant(), which checks live_room_participants -- a
-- video/audio CALL table, not chat_participants. Verified live on
-- 2026-09-19: chat_participants has 144 rows across 128 rooms,
-- live_room_participants has 12 rows across 7 rooms, zero room_id overlap.
-- Every voice/video message send in an ordinary conversation has been
-- rejected by this policy since it was introduced (20260902113000); the
-- only 2 existing message_type='voice' rows predate it (2026-02-18/19).
--
-- Fix: gate chat-media on the same chat_participants check chat_messages'
-- own "Room participants can read messages" policy already uses.
--
-- public.is_chat_room_participant(_room_id uuid, _user_id uuid) already
-- exists with exactly this logic (checked live before writing this
-- migration) -- reused as-is, not redefined, to avoid a second
-- near-duplicate participant-check function.

DROP POLICY IF EXISTS "Participants can upload chat-media files" ON storage.objects;
CREATE POLICY "Participants can upload chat-media files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND is_chat_room_participant((NULLIF((storage.foldername(name))[1], ''))::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "Participants can read chat-media files" ON storage.objects;
CREATE POLICY "Participants can read chat-media files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND is_chat_room_participant((NULLIF((storage.foldername(name))[1], ''))::uuid, auth.uid())
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, created_at)
    )
  );
