-- Extend call_events.event_type to cover every hop in the call-signaling
-- chain, not just the Daily-room join/leave logged from
-- JitsiCall.tsx/JitsiRoom.tsx (20260910160000_call_events.sql): invite
-- sent by the caller, invite actually seen by the callee's client,
-- answer sent by the callee, answer actually seen by the caller's
-- client, and daily_joined (renamed from the original 'join', to match
-- this vocabulary -- 'leave' is unchanged). A dropped hop between
-- *_sent and the matching *_seen is exactly how "caller/callee reports
-- no signal at all" surfaces in this table -- a *_sent row with no
-- corresponding *_seen row for the same call id.
ALTER TABLE public.call_events DROP CONSTRAINT IF EXISTS call_events_event_type_check;
ALTER TABLE public.call_events ADD CONSTRAINT call_events_event_type_check
  CHECK (event_type IN (
    'join', 'leave',
    'invite_sent', 'invite_seen',
    'answered_sent', 'answered_seen',
    'daily_joined'
  ));
