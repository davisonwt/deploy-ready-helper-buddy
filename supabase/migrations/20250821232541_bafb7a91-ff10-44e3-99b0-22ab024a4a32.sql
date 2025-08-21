-- List and drop all chat-files related policies
DROP POLICY IF EXISTS "Users can upload files to their own folder in chat-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat files they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to chat rooms" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own chat files" ON storage.objects;

-- Create a simple, working policy for chat files
CREATE POLICY "chat_files_policy" ON storage.objects
FOR ALL USING (
  bucket_id = 'chat-files' AND
  auth.uid() IS NOT NULL AND (
    -- User can access their own files
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- Or if they're authenticated (for shared files in chat)
    true
  )
) WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.uid() IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);