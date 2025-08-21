-- Add foreign key constraints for chat functionality
-- First, ensure we have a messages table with proper structure
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text,
  message_type text NOT NULL DEFAULT 'text',
  file_url text,
  file_name text,
  file_type text,
  file_size bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add foreign key constraint linking chat_messages.sender_id to profiles.user_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_messages_sender_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages 
    ADD CONSTRAINT chat_messages_sender_id_fkey 
    FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint linking chat_participants.user_id to auth.users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_participants_user_id_fkey'
  ) THEN
    ALTER TABLE public.chat_participants 
    ADD CONSTRAINT chat_participants_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add RLS policies for chat_messages if they don't exist
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy for users to view messages in rooms they participate in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'Users can view messages in their rooms'
  ) THEN
    CREATE POLICY "Users can view messages in their rooms" ON public.chat_messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE chat_participants.room_id = chat_messages.room_id 
        AND chat_participants.user_id = auth.uid() 
        AND chat_participants.is_active = true
      )
    );
  END IF;
END $$;

-- Policy for users to insert messages in rooms they participate in
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_messages' 
    AND policyname = 'Users can send messages in their rooms'
  ) THEN
    CREATE POLICY "Users can send messages in their rooms" ON public.chat_messages
    FOR INSERT WITH CHECK (
      auth.uid() = sender_id AND
      EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE chat_participants.room_id = chat_messages.room_id 
        AND chat_participants.user_id = auth.uid() 
        AND chat_participants.is_active = true
      )
    );
  END IF;
END $$;