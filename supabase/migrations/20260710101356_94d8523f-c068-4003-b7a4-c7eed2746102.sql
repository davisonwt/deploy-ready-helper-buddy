
DROP POLICY IF EXISTS "Users can view all room members" ON public.room_members;
CREATE POLICY "Members can view co-members"
  ON public.room_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.room_members me
      WHERE me.room_id = room_members.room_id
        AND me.user_id = auth.uid()
        AND COALESCE(me.is_active, true) = true
    )
  );

DROP POLICY IF EXISTS "Anyone can view public tracks" ON public.dj_music_tracks;
DROP POLICY IF EXISTS "Authenticated users can view all public tracks" ON public.dj_music_tracks;
DROP POLICY IF EXISTS "Authenticated users can view public tracks" ON public.dj_music_tracks;
CREATE POLICY "Authenticated users can view public tracks"
  ON public.dj_music_tracks FOR SELECT
  TO authenticated
  USING (is_public = true);

DROP POLICY IF EXISTS "Public can read public profiles" ON public.public_profiles;
CREATE POLICY "Authenticated users can read public profiles"
  ON public.public_profiles FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.public_profiles FROM anon;

DROP POLICY IF EXISTS "Users insert own non-system messages" ON public.chat_messages;
CREATE POLICY "Users insert own non-system messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (system_metadata IS NULL OR COALESCE((system_metadata ->> 'is_system'), 'false') <> 'true')
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.room_id = chat_messages.room_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = true
    )
  );

DROP POLICY IF EXISTS "Senders can update own messages" ON public.chat_messages;
CREATE POLICY "Senders can update own messages"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (
    sender_id = auth.uid()
    AND (system_metadata IS NULL OR COALESCE((system_metadata ->> 'is_system'), 'false') <> 'true')
  );
