CREATE POLICY "Public read covers/thumbnails in premium-room"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'premium-room'
  AND (
    (storage.foldername(name))[1] IN ('covers','thumbnails')
    OR name LIKE 'covers/%'
    OR name LIKE 'thumbnails/%'
  )
);

CREATE POLICY "Public read covers/thumbnails in music-tracks"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'music-tracks'
  AND (
    (storage.foldername(name))[1] IN ('covers','thumbnails')
    OR name LIKE 'covers/%'
    OR name LIKE 'thumbnails/%'
  )
);

CREATE POLICY "Public read covers/thumbnails in dj-music"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'dj-music'
  AND (
    (storage.foldername(name))[1] IN ('covers','thumbnails')
    OR name LIKE 'covers/%'
    OR name LIKE 'thumbnails/%'
  )
);