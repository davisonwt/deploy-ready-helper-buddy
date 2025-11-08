-- Allow gosat role users to delete chat messages (including system delivery messages)
CREATE POLICY "Gosats can delete any chat messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gosat'
  )
);