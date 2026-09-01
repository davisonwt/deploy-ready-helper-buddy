-- CORRECTS 20260902113000: that migration's gate took effect immediately
-- on every existing object in these buckets, before any backfill had run
-- to log a verdict for them -- meaning real, already-shared, never-flagged
-- content (chat photos, WH photos/notes, room media, etc.) uploaded before
-- this feature existed would have gone invisible to everyone but its
-- uploader the moment that migration applied. That is exactly what
-- wh-moderation.txt point 4 says not to do ("do not auto-remove existing
-- content", "report the counts to me before anything is hidden").
--
-- Fix: media_is_allowed() now grandfathers anything created before this
-- feature's cutover. Pre-cutover content stays visible by default and is
-- only actually hidden once a gosat has reviewed a flagged verdict for it
-- and explicitly chosen 'remove' -- mirrors the same rule content_reports
-- uses ("stays visible until a gosat acts"). Post-cutover content is
-- unaffected: still real-time gated on the latest scan verdict, still
-- invisible to everyone but the uploader/admin until it is 'allow'.
--
-- The backfill script (point 4) can now safely write block/uncertain rows
-- for old content without silently hiding anything -- those rows only
-- populate the review queue until a gosat acts on them.

CREATE OR REPLACE FUNCTION public.media_is_allowed(_bucket text, _path text, _created_at timestamptz DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    CASE
      WHEN _created_at IS NOT NULL AND _created_at < '2026-09-01T23:00:00+00'::timestamptz THEN
        NOT EXISTS (
          SELECT 1 FROM public.media_moderation
          WHERE bucket_id = _bucket AND object_path = _path
            AND reviewed_at IS NOT NULL AND review_action = 'remove'
        )
      ELSE (
        SELECT verdict = 'allow'
        FROM public.media_moderation
        WHERE bucket_id = _bucket AND object_path = _path
        ORDER BY created_at DESC
        LIMIT 1
      )
    END,
    false
  )
$$;
GRANT EXECUTE ON FUNCTION public.media_is_allowed(text, text, timestamptz) TO authenticated, anon;

-- Re-point every policy from 20260902113000 at the 3-arg grandfather-aware
-- version, passing the object's own created_at. Same enumeration, same
-- policies, only the media_is_allowed(...) calls change.

DROP POLICY IF EXISTS "Chat files readable by room participants (chat-files)" ON storage.objects;
CREATE POLICY "Chat files readable by room participants (chat-files)"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND EXISTS (
      SELECT 1 FROM chat_files cf
      JOIN chat_participants cp ON cp.room_id = cf.room_id AND cp.user_id = auth.uid() AND cp.is_active = true
      WHERE cf.file_path = objects.name
    )
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Users access own chat files" ON storage.objects;
CREATE POLICY "Users access own chat files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "chat_files_select" ON storage.objects;
CREATE POLICY "chat_files_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Participants can read chat-media files" ON storage.objects;
CREATE POLICY "Participants can read chat-media files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND is_live_room_participant((NULLIF((storage.foldername(name))[1], ''))::uuid, auth.uid())
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "DJs can view their own music tracks" ON storage.objects;
CREATE POLICY "DJs can view their own music tracks"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'music-tracks' AND auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM radio_djs WHERE radio_djs.user_id = auth.uid())
    AND (
      owner = auth.uid()
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Public music-tracks cover art readable by all" ON storage.objects;
CREATE POLICY "Public music-tracks cover art readable by all"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'music-tracks'
    AND (name LIKE 'covers/%' OR name LIKE '%/covers/%' OR name LIKE 'thumbnails/%' OR name LIKE '%/thumbnails/%')
    AND (
      (auth.uid() IS NOT NULL AND owner = auth.uid())
      OR (auth.uid() IS NOT NULL AND public.is_admin_or_gosat(auth.uid()))
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Public read covers/thumbnails in music-tracks" ON storage.objects;
CREATE POLICY "Public read covers/thumbnails in music-tracks"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'music-tracks'
    AND ((storage.foldername(name))[1] = ANY (ARRAY['covers', 'thumbnails']) OR name LIKE 'covers/%' OR name LIKE 'thumbnails/%')
    AND (
      (auth.uid() IS NOT NULL AND owner = auth.uid())
      OR (auth.uid() IS NOT NULL AND public.is_admin_or_gosat(auth.uid()))
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "music_tracks_owner_read" ON storage.objects;
CREATE POLICY "music_tracks_owner_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'music-tracks'
    AND (auth.uid() = owner OR (storage.foldername(name))[1] = auth.uid()::text)
    AND (
      auth.uid() = owner
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Premium-room read owner or buyer or admin" ON storage.objects;
CREATE POLICY "Premium-room read owner or buyer or admin"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'premium-room' AND auth.uid() IS NOT NULL
    AND (
      auth.uid()::text = (storage.foldername(name))[2]
      OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM premium_room_access pra WHERE pra.user_id = auth.uid() AND pra.payment_status = 'completed' AND pra.room_id::text = (storage.foldername(objects.name))[1])
      OR EXISTS (SELECT 1 FROM premium_item_purchases pip WHERE pip.buyer_id = auth.uid() AND pip.payment_status = 'completed' AND pip.room_id::text = (storage.foldername(objects.name))[1])
    )
    AND (
      owner = auth.uid()
      OR auth.uid()::text = (storage.foldername(name))[2]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Public premium-room cover art readable by all" ON storage.objects;
CREATE POLICY "Public premium-room cover art readable by all"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'premium-room' AND (name LIKE 'covers/%' OR name LIKE 'thumbnails/%')
    AND (
      (auth.uid() IS NOT NULL AND owner = auth.uid())
      OR (auth.uid() IS NOT NULL AND public.is_admin_or_gosat(auth.uid()))
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Public read covers/thumbnails in premium-room" ON storage.objects;
CREATE POLICY "Public read covers/thumbnails in premium-room"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'premium-room'
    AND ((storage.foldername(name))[1] = ANY (ARRAY['covers', 'thumbnails']) OR name LIKE 'covers/%' OR name LIKE 'thumbnails/%')
    AND (
      (auth.uid() IS NOT NULL AND owner = auth.uid())
      OR (auth.uid() IS NOT NULL AND public.is_admin_or_gosat(auth.uid()))
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Hearts photos: read own" ON storage.objects;
CREATE POLICY "Hearts photos: read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tribal-hearts-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "hearts_media_matched_read" ON storage.objects;
CREATE POLICY "hearts_media_matched_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tribal-hearts-media'
    AND is_tribal_hearts_member(auth.uid())
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM tribal_hearts_matches m
        WHERE m.status = 'mutual'::hearts_match_status
          AND ((m.member_a_id = auth.uid() AND m.member_b_id::text = (storage.foldername(objects.name))[1])
            OR (m.member_b_id = auth.uid() AND m.member_a_id::text = (storage.foldername(objects.name))[1]))
      )
    )
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Hosts read own radio session assets" ON storage.objects;
CREATE POLICY "Hosts read own radio session assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'radio-session-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Session participants access documents" ON storage.objects;
CREATE POLICY "Session participants access documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-documents'
    AND EXISTS (
      SELECT 1 FROM live_session_participants lsp
      WHERE lsp.user_id = auth.uid() AND lsp.status = 'active' AND (storage.foldername(objects.name))[1] = lsp.session_id::text
    )
    AND (
      owner = auth.uid()
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Users can view their own journal media" ON storage.objects;
CREATE POLICY "Users can view their own journal media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'journal-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );

DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;
CREATE POLICY "Users can view their own videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name, objects.created_at)
    )
  );
