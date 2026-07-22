DROP POLICY IF EXISTS "Public premium-room cover art readable by all" ON storage.objects;
DROP POLICY IF EXISTS "Public music-tracks cover art readable by all" ON storage.objects;
DROP POLICY IF EXISTS "Public dj-music cover art readable by all" ON storage.objects;

CREATE POLICY "Public premium-room cover art readable by all"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'premium-room'
  AND (
    name LIKE 'covers/%'
    OR name LIKE 'thumbnails/%'
  )
);

CREATE POLICY "Public music-tracks cover art readable by all"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'music-tracks'
  AND (
    name LIKE 'covers/%'
    OR name LIKE '%/covers/%'
    OR name LIKE 'thumbnails/%'
    OR name LIKE '%/thumbnails/%'
  )
);

CREATE POLICY "Public dj-music cover art readable by all"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'dj-music'
  AND (
    name LIKE 'covers/%'
    OR name LIKE '%/covers/%'
    OR name LIKE 'thumbnails/%'
    OR name LIKE '%/thumbnails/%'
  )
);