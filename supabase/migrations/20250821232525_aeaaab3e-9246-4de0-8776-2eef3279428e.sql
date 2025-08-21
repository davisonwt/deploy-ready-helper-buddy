-- Drop any existing chat-files policies that might be conflicting
DROP POLICY IF EXISTS "Users can upload files to their own folder in chat-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat files" ON storage.objects;

-- Create proper storage policies for chat-files bucket
CREATE POLICY "Users can upload their own chat files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat files they have access to" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-files' AND (
    -- User can view their own files
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- User can view files in chat rooms they participate in
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_participants cp ON cm.room_id = cp.room_id
      WHERE cm.file_url LIKE '%' || name
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  )
);

CREATE POLICY "Users can update their own chat files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own chat files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);