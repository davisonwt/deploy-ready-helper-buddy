
-- Drop the overly permissive policy that bypasses all room membership checks
DROP POLICY IF EXISTS "Allow authenticated users full access to chat_messages" ON public.chat_messages;

-- Update INSERT policy to also require room membership
DROP POLICY IF EXISTS "Users insert own non-system messages" ON public.chat_messages;
CREATE POLICY "Users insert own non-system messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND COALESCE((system_metadata ->> 'is_system'), 'false') <> 'true'
    AND EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = chat_messages.room_id
        AND cp.user_id = auth.uid()
        AND cp.is_active = true
    )
  );
