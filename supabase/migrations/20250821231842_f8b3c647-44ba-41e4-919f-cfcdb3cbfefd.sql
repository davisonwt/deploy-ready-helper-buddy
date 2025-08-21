-- Check and create RLS policies for chat-files storage bucket

-- Create policy to allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload files to their own folder in chat-files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to read files they uploaded or that were shared in rooms they participate in
CREATE POLICY "Users can read chat files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-files' AND (
    -- User can read their own files
    auth.uid()::text = (storage.foldername(name))[1] OR
    -- User can read files from chat rooms they participate in
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_participants cp ON cm.room_id = cp.room_id
      WHERE cm.file_url LIKE '%' || name || '%'
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  )
);

-- Create policy to allow users to update their own files
CREATE POLICY "Users can update their own chat files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to delete their own files
CREATE POLICY "Users can delete their own chat files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);