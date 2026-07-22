DROP POLICY IF EXISTS "Participants can view session participants" ON public.live_session_participants;

CREATE POLICY "Participants can view session participants"
ON public.live_session_participants
FOR SELECT
TO authenticated
USING (public.user_is_active_in_session(session_id));