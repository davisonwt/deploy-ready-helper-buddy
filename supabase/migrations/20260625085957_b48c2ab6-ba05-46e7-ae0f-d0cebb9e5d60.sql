
DROP POLICY IF EXISTS "Authenticated users can read their docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read music" ON storage.objects;

CREATE POLICY "Docs readable by uploader or session participant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'live-session-docs'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.live_session_participants p
      WHERE p.session_id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()
        AND p.left_at IS NULL
    )
  )
);

CREATE POLICY "Music readable by uploader or session participant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'live-session-music'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.live_session_participants p
      WHERE p.session_id::text = (storage.foldername(name))[2]
        AND p.user_id = auth.uid()
        AND p.left_at IS NULL
    )
  )
);
