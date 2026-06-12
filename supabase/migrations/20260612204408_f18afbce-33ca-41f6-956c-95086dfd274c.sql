GRANT ALL ON public.grove_message_queue TO service_role;

DROP POLICY IF EXISTS "Backend service can manage grove message queue" ON public.grove_message_queue;
CREATE POLICY "Backend service can manage grove message queue"
ON public.grove_message_queue
FOR ALL
TO service_role
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');