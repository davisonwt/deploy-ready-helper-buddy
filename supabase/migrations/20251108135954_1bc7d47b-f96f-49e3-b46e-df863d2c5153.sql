-- Temporarily bypass RLS for storage and chat to allow authenticated users access

-- 1. Allow authenticated users to upload/read/delete files in premium-room bucket
DROP POLICY IF EXISTS "Allow authenticated access to premium-room" ON storage.objects;
DROP POLICY IF EXISTS "Premium room members can upload" ON storage.objects;
DROP POLICY IF EXISTS "Premium room members can read" ON storage.objects;
DROP POLICY IF EXISTS "Premium room members can delete" ON storage.objects;

CREATE POLICY "Allow authenticated access to premium-room"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'premium-room')
WITH CHECK (bucket_id = 'premium-room');

-- 2. Allow authenticated users to do anything with chat_messages
DROP POLICY IF EXISTS "Allow inserts for authenticated users in premium rooms" ON chat_messages;
DROP POLICY IF EXISTS "Allow selects for authenticated users in premium rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to non-premium rooms" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages in non-premium rooms" ON chat_messages;

CREATE POLICY "Allow authenticated users full access to chat_messages"
ON chat_messages
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);