-- 1) profile_access_logs: remove client insert; service-role only
DROP POLICY IF EXISTS "Users can log their own profile access" ON public.profile_access_logs;
REVOKE INSERT ON public.profile_access_logs FROM authenticated, anon;
GRANT ALL ON public.profile_access_logs TO service_role;

-- 2) storage.objects: drop permissive bucket-only INSERT policies
DROP POLICY IF EXISTS "Allow authenticated users to upload music" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to dj-music" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload to music-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to music-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload ads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload art" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload music" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload comments data" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload memry media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload orchard images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload orchard videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload provider assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload session documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload stay photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Orchard creators can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Orchard creators can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Orchard creators can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "DJs can upload music tracks" ON storage.objects;

-- 3) Owner-scoped INSERT policies
CREATE POLICY "Own folder upload: dj-music"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dj-music' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: music-tracks"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'music-tracks' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: chat-files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: memry-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memry-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: orchard-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'orchard-images'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (
      (storage.foldername(name))[1] = 'products'
      AND EXISTS (
        SELECT 1 FROM public.sowers s
        WHERE s.user_id = auth.uid()
          AND s.id::text = (storage.foldername(name))[2]
      )
    )
  )
);

CREATE POLICY "Own folder upload: orchard-videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'orchard-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: orchard-audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'orchard-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: live-session-docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'live-session-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: live-session-music"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'live-session-music' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: live-session-art"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'live-session-art' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: provider-assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'provider-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: stay-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'stay-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: radio-live-comments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'radio-live-comments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Own folder upload: biz-ads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'biz-ads' AND (storage.foldername(name))[1] = auth.uid()::text);
