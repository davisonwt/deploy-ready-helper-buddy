DROP POLICY IF EXISTS "music_tracks_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "music_tracks_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "music_tracks_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "music_tracks_authenticated_read" ON storage.objects;

CREATE POLICY "music_tracks_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'music-tracks'
  AND (
    auth.uid() = owner
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "music_tracks_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'music-tracks'
  AND (
    auth.uid() = owner
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "music_tracks_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'music-tracks'
  AND (
    auth.uid() = owner
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "music_tracks_authenticated_read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'music-tracks');

CREATE INDEX IF NOT EXISTS idx_dj_music_tracks_radio_eligible
  ON public.dj_music_tracks (radio_eligible)
  WHERE radio_eligible = true;