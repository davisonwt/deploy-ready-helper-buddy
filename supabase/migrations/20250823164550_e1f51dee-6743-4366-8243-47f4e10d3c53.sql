-- Update RLS policies to allow public viewing of active live sessions

-- Allow public viewing of active radio live sessions
DROP POLICY IF EXISTS "Authenticated users can view live sessions" ON radio_live_sessions;

CREATE POLICY "Public can view active radio live sessions"
ON radio_live_sessions
FOR SELECT
TO public
USING (status IN ('waiting', 'live'));

-- Allow public viewing of live session participants for discovery
DROP POLICY IF EXISTS "Users can view listeners in their sessions" ON session_listeners;

CREATE POLICY "Public can view session listeners for discovery"
ON session_listeners
FOR SELECT
TO public
USING (is_active = true);

-- Allow public viewing of live session participants
CREATE POLICY "Public can view active live session participants"
ON live_session_participants
FOR SELECT
TO public
USING (status = 'active');

-- Allow authenticated users to join as listeners (fix INSERT policy)
CREATE POLICY "Authenticated users can join as listeners updated"
ON session_listeners
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow public viewing of radio schedule for live sessions
CREATE POLICY "Public can view active radio schedules"
ON radio_schedule
FOR SELECT
TO public
USING (status = 'live' OR (start_time <= now() AND end_time > now()));

-- Allow public viewing of radio shows for live sessions
CREATE POLICY "Public can view radio shows"
ON radio_shows
FOR SELECT
TO public
USING (true);

-- Allow public viewing of radio DJs for live sessions
CREATE POLICY "Public can view active radio DJs"
ON radio_djs
FOR SELECT
TO public
USING (is_active = true);