-- Fix chat_messages RLS policy - remove conflicting policy checking non-existent room_members table
DROP POLICY IF EXISTS "Users can send messages in their rooms" ON public.chat_messages;

-- The correct policy checking chat_participants already exists:
-- "Users can send messages to their rooms" checks chat_participants table