-- Add the moderation gate to every existing SELECT policy on the
-- already-private target buckets. Every SELECT (permissive) policy on a
-- bucket is OR-combined by Postgres -- missing even one means the gate is
-- bypassed for whichever access path that policy covers, so every policy
-- touching these buckets is enumerated and rewritten, not just one.
--
-- Gate clause: the uploader can always see their own object (folder-owner
-- check, or storage.objects.owner where that's what a policy already used);
-- gosat/admin can always see everything (review queue); everyone else
-- needs media_moderation to say verdict='allow' for that exact bucket+path.
-- No row (never scanned) means media_is_allowed() returns false -- an
-- unscanned file is unreadable by construction.
--
-- IMPORTANT CAVEAT (see SESSION-STATE.md): tribal-hearts-photos and
-- tribal-hearts-media do NOT primarily rely on this RLS gate. Both
-- persist a pre-signed URL (createSignedUrl, days-long expiry) directly
-- into a DB column at upload time (tribal_hearts_profiles.photos,
-- chat_messages.file_url) -- a signed URL is a self-contained bearer
-- token Supabase Storage does not re-check against RLS on each fetch, so
-- this policy change alone would NOT stop an unmoderated photo/note from
-- being viewable via a URL that was already signed and stored. The real
-- gate for those two buckets is client-side: moderate-media must be
-- called and must return 'allow' BEFORE the app ever calls
-- createSignedUrl/persists the result. This migration still adds the RLS
-- gate as defense-in-depth (blocks direct storage reads and any future
-- re-signing of an unscanned file), but is not sufficient alone there.

-- ── chat-files (bucket) ──────────────────────────────────────────────────
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
      OR public.media_is_allowed(bucket_id, name)
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
      OR public.media_is_allowed(bucket_id, name)
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
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── chat-media ───────────────────────────────────────────────────────────
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
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── music-tracks ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "DJs can view their own music tracks" ON storage.objects;
CREATE POLICY "DJs can view their own music tracks"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'music-tracks' AND auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM radio_djs WHERE radio_djs.user_id = auth.uid())
    AND (
      owner = auth.uid()
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name)
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
      OR public.media_is_allowed(bucket_id, name)
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
      OR public.media_is_allowed(bucket_id, name)
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
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── premium-room ─────────────────────────────────────────────────────────
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
      OR public.media_is_allowed(bucket_id, name)
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
      OR public.media_is_allowed(bucket_id, name)
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
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── tribal-hearts-photos (RLS backstop only -- see caveat above) ──────────
DROP POLICY IF EXISTS "Hearts photos: read own" ON storage.objects;
CREATE POLICY "Hearts photos: read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tribal-hearts-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── tribal-hearts-media (RLS backstop only -- see caveat above) ───────────
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
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── radio-session-assets ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Hosts read own radio session assets" ON storage.objects;
CREATE POLICY "Hosts read own radio session assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'radio-session-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── session-documents ────────────────────────────────────────────────────
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
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── journal-media ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own journal media" ON storage.objects;
CREATE POLICY "Users can view their own journal media"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'journal-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name)
    )
  );

-- ── videos ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;
CREATE POLICY "Users can view their own videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin_or_gosat(auth.uid())
      OR public.media_is_allowed(bucket_id, name)
    )
  );
-- 'videos' (community_videos) is watched by the whole tribe, not just the
-- uploader's own folder -- the community_videos TABLE row is what other
-- members actually query to discover a video, and its client read path
-- goes through useCommunityVideos.jsx -> getPublicUrl on this bucket. That
-- hook is gated at the application layer in this pass (see
-- SESSION-STATE.md); a "readable by the whole tribe once allowed" storage
-- policy was deliberately not added here because 'videos' has no public
-- per-video SELECT policy today either (only the owner's own folder does)
-- -- broadening read access is a bigger change than adding the gate to
-- what already exists, and out of scope for a moderation-only pass.
