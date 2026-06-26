CREATE POLICY "Public dj-music tracks readable by all"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dj-music'
  AND EXISTS (
    SELECT 1 FROM public.dj_music_tracks t
    WHERE t.is_public = true AND t.file_url = storage.objects.name
  )
);