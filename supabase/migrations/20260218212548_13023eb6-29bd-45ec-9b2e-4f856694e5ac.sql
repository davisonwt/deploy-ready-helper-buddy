-- Add broadcast_mode to radio_schedule so DJs can choose live or pre-recorded
ALTER TABLE public.radio_schedule 
ADD COLUMN broadcast_mode text NOT NULL DEFAULT 'live' 
CHECK (broadcast_mode IN ('live', 'pre_recorded'));

-- Add playlist_id to radio_schedule so DJs can assign a playlist for pre-recorded slots
ALTER TABLE public.radio_schedule 
ADD COLUMN playlist_id uuid REFERENCES public.dj_playlists(id);

COMMENT ON COLUMN public.radio_schedule.broadcast_mode IS 'Whether the DJ will broadcast live or use pre-recorded audio';
COMMENT ON COLUMN public.radio_schedule.playlist_id IS 'Playlist to auto-play for pre-recorded broadcast mode';