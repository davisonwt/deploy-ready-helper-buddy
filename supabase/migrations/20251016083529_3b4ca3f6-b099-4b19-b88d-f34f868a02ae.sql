-- Add insert policy so room creators can send messages (fix RLS 42501)
CREATE POLICY "Room creators can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.chat_rooms cr
    WHERE cr.id = chat_messages.room_id
      AND cr.created_by = auth.uid()
  )
);
