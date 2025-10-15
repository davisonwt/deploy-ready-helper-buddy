-- Ensure chat_files bucket is public and has proper policies for uploads and reads

-- 1) Make bucket public (so getPublicUrl works)
UPDATE storage.buckets
SET public = true
WHERE id = 'chat_files';

-- 2) Storage policies for chat_files
DO $$
BEGIN
  -- Public read for files in chat_files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read chat_files'
  ) THEN
    CREATE POLICY "Public read chat_files"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'chat_files');
  END IF;

  -- Authenticated users can upload to their own folder: chat-room-docs/{user_id}/...
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can upload chat_files'
  ) THEN
    CREATE POLICY "Owners can upload chat_files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'chat_files'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;

  -- Authenticated users can update their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can update chat_files'
  ) THEN
    CREATE POLICY "Owners can update chat_files"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'chat_files'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;

  -- Authenticated users can delete their own files
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can delete chat_files'
  ) THEN
    CREATE POLICY "Owners can delete chat_files"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'chat_files'
      AND auth.uid()::text = (storage.foldername(name))[2]
    );
  END IF;
END $$;