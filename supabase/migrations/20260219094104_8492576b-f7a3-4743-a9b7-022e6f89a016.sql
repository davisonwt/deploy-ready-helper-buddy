-- Allow message senders to update their own messages
CREATE POLICY "Users can update own messages"
ON public.live_session_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Allow message senders to delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.live_session_messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);