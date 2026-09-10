-- call_events: one row per Daily call join/leave, for exporting "who was
-- in which room when" as a CSV -- Daily's own Meetings API (see
-- scripts/studio/daily-sessions.md) already has this, but only per-room
-- and only reachable via a manual curl; this is the same data queryable
-- from Supabase alongside everything else, and covers both call paths
-- (ChatRoom/JitsiCall's call_session rooms and OneOnOneRoom/JitsiRoom's
-- custom rooms) in one place.
CREATE TABLE public.call_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('join', 'leave')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_events_room_name ON public.call_events (room_name, created_at);
CREATE INDEX idx_call_events_user ON public.call_events (user_id, created_at);

ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

-- Every join/leave is logged as the browser's own authenticated user --
-- never on another user's behalf.
CREATE POLICY "Users can log their own call events"
ON public.call_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own call events"
ON public.call_events FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Founder/GoSat need to see both sides of a call to build the "who was in
-- which room when" CSV -- a participant's own-events-only view can't
-- show whether the OTHER party ever actually joined.
CREATE POLICY "Admins and GoSat can view all call events"
ON public.call_events FOR SELECT TO authenticated
USING (public.is_admin_or_gosat(auth.uid()));
