-- Create the chat-files storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false);

-- Ensure RLS is enabled for the bucket (it should be by default)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-files';