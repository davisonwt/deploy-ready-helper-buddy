-- Records when a member accepted the Disclaimer (/disclaimer) -- set by
-- useAuth.jsx's register() immediately after a successful signup, across
-- all three signup entry points (RegisterPage.tsx, QuickRegistration.jsx,
-- JoinPage.tsx's invite-based signup), each of which now blocks its own
-- submit button until its own required "I have read and accept the
-- Disclaimer" checkbox is ticked. NULL for every account created before
-- this -- no backfill; the timestamp means "actually accepted", not
-- "existed on this date".

ALTER TABLE public.profiles ADD COLUMN disclaimer_accepted_at timestamptz;
