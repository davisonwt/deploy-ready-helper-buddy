-- Drop ALL existing chat-files policies
DROP POLICY IF EXISTS "Users can upload files to their own folder in chat-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat files they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to chat rooms" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own chat files" ON storage.objects;

-- Create clean, working storage policies for chat-files bucket
CREATE POLICY "chat_files_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "chat_files_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "chat_files_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "chat_files_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);