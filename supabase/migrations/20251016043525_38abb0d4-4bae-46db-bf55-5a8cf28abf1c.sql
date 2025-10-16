-- Ensure bucket exists and is publicly readable for audio playback
-- Create or update the music-tracks bucket to be public
insert into storage.buckets (id, name, public)
values ('music-tracks', 'music-tracks', true)
on conflict (id) do update set public = EXCLUDED.public, name = EXCLUDED.name;

-- Allow public read access to objects in music-tracks bucket (needed for streaming audio)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read for music-tracks'
  ) THEN
    CREATE POLICY "Public read for music-tracks"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'music-tracks');
  END IF;
END $$;

-- Optional: allow authenticated users to upload/update/delete their own files in the bucket (future-proofing)
-- Note: These policies are safe and scoped to the bucket only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can upload to music-tracks'
  ) THEN
    CREATE POLICY "Users can upload to music-tracks"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'music-tracks');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can update own objects in music-tracks'
  ) THEN
    CREATE POLICY "Users can update own objects in music-tracks"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'music-tracks' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'music-tracks' AND owner = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can delete own objects in music-tracks'
  ) THEN
    CREATE POLICY "Users can delete own objects in music-tracks"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'music-tracks' AND owner = auth.uid());
  END IF;
END $$;