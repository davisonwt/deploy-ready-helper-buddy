-- Ensure RLS is enabled
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Allow active participants to send messages (in addition to creators)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'chat_messages' 
      AND policyname = 'Participants can send messages (active)'
  ) THEN
    CREATE POLICY "Participants can send messages (active)"
    ON public.chat_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = sender_id
      AND EXISTS (
        SELECT 1 FROM public.chat_participants cp
        WHERE cp.room_id = chat_messages.room_id
          AND cp.user_id = auth.uid()
          AND cp.is_active = true
      )
    );
  END IF;
END$$;