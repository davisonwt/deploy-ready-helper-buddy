-- End all currently active live streams (one-shot reset)
UPDATE public.live_streams
SET status = 'ended', ended_at = COALESCE(ended_at, now())
WHERE status IN ('live','active','starting');

-- Deactivate stale live rooms
UPDATE public.live_rooms
SET is_active = false
WHERE is_active = true;