-- Bug report (Ed, iPhone, sow2growapp.com): SeedCard's Voice/Video button
-- on a stall visit failed with "Call failed: unauthorized" and left no
-- trace anywhere queryable -- the existing call_events rows only cover
-- signaling hops that actually succeeded (invite_sent/invite_seen/
-- answered_sent/answered_seen/daily_joined/leave, 20260910170000). Adds a
-- 'call_failed' event type plus a nullable `reason` column carrying the
-- thrown error's message (the edge function's own error string --
-- "unauthorized", "forbidden", "daily_token_failed", etc. -- or a
-- client-side one like "Your session expired...") so a failed call is
-- now visible in the same table instead of only in the caller's own
-- console/toast.
ALTER TABLE public.call_events ADD COLUMN reason text;

ALTER TABLE public.call_events DROP CONSTRAINT IF EXISTS call_events_event_type_check;
ALTER TABLE public.call_events ADD CONSTRAINT call_events_event_type_check
  CHECK (event_type IN (
    'join', 'leave',
    'invite_sent', 'invite_seen',
    'answered_sent', 'answered_seen',
    'daily_joined',
    'call_failed'
  ));
