-- Add delete policy for chat messages
CREATE POLICY "Users can delete their own messages" ON public.chat_messages
FOR DELETE USING (auth.uid() = sender_id);