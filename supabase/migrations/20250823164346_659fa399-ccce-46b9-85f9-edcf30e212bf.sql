-- Update RLS policies to allow public viewing of active live sessions

-- Allow public viewing of active radio live sessions
DROP POLICY IF EXISTS "Authenticated users can view live sessions" ON radio_live_sessions;

CREATE POLICY "Public can view active radio live sessions"
ON radio_live_sessions
FOR SELECT
USING (status IN ('waiting', 'live'));

-- Allow public viewing of live session participants for discovery
DROP POLICY IF EXISTS "Users can view listeners in their sessions" ON session_listeners;

CREATE POLICY "Public can view session listeners for discovery"
ON session_listeners
FOR SELECT
USING (is_active = true);

-- Allow public viewing of live session participants
CREATE POLICY "Public can view active live session participants"
ON live_session_participants
FOR SELECT
USING (status = 'active');

-- Allow authenticated users to join as listeners
ALTER TABLE session_listeners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can join as listeners"
ON session_listeners
FOR INSERT
USING (auth.uid() = user_id);

-- Allow public viewing of radio schedule for live sessions
CREATE POLICY "Public can view active radio schedules"
ON radio_schedule
FOR SELECT
USING (status = 'live' OR (start_time <= now() AND end_time > now()));

-- Allow public viewing of radio shows for live sessions
CREATE POLICY "Public can view radio shows"
ON radio_shows
FOR SELECT
USING (true);

-- Allow public viewing of radio DJs for live sessions
CREATE POLICY "Public can view active radio DJs"
ON radio_djs
FOR SELECT
USING (is_active = true);