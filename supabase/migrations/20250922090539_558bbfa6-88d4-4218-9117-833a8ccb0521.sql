-- Create chat-bucket for file uploads if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for chat file uploads
DROP POLICY IF EXISTS "Users can upload files to chat-files bucket" ON storage.objects;
CREATE POLICY "Users can upload files to chat-files bucket"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view files in chat-files bucket" ON storage.objects;
CREATE POLICY "Users can view files in chat-files bucket"
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "Users can delete their own files in chat-files bucket" ON storage.objects;
CREATE POLICY "Users can delete their own files in chat-files bucket"
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for chat tables
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;

-- Add chat tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;