-- OneOnOneRoom's call-invite signal has no call_sessions row to poll --
-- it's a broadcast-only event with nothing persisted, unlike ChatRoom's
-- call_sessions-backed flow. Logging invite_sent/invite_seen/
-- answered_sent to call_events (with room_name = the live_rooms id) and
-- letting the OTHER participant poll for them gives it the same
-- broadcast-miss fallback -- but call_events' existing SELECT policy
-- only lets a user see rows THEY logged (auth.uid() = user_id), so the
-- callee polling for an invite the CALLER logged would see nothing.
--
-- This adds visibility for the other participant specifically: a user
-- may SELECT a call_events row when its room_name matches a live room
-- they're themselves a participant of, regardless of who logged it.
CREATE POLICY "Live room participants can view call_events for their room"
ON public.call_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_room_participants lrp
    WHERE lrp.user_id = auth.uid()
      AND lrp.room_id::text = call_events.room_name
  )
);
