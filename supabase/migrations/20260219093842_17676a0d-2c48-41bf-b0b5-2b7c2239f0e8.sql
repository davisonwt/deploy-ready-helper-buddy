-- Allow any authenticated user to insert comments/requests into live_session_messages
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Participants can send messages" ON public.live_session_messages;

-- Create a more permissive policy that allows any authenticated user to send messages
CREATE POLICY "Authenticated users can send messages"
ON public.live_session_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Also allow any authenticated user to view messages (not just participants)
DROP POLICY IF EXISTS "Participants can view session messages" ON public.live_session_messages;

CREATE POLICY "Authenticated users can view messages"
ON public.live_session_messages
FOR SELECT
TO authenticated
USING (true);