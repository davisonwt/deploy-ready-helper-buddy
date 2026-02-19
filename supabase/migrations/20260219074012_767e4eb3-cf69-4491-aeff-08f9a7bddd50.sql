
ALTER TABLE public.seeds 
  ADD COLUMN IF NOT EXISTS music_mood TEXT,
  ADD COLUMN IF NOT EXISTS music_genre TEXT;

ALTER TABLE public.dj_music_tracks
  ADD COLUMN IF NOT EXISTS music_mood TEXT,
  ADD COLUMN IF NOT EXISTS music_genre TEXT;

CREATE INDEX IF NOT EXISTS idx_seeds_music_mood ON public.seeds(music_mood);
CREATE INDEX IF NOT EXISTS idx_seeds_music_genre ON public.seeds(music_genre);
CREATE INDEX IF NOT EXISTS idx_dj_tracks_music_mood ON public.dj_music_tracks(music_mood);
CREATE INDEX IF NOT EXISTS idx_dj_tracks_music_genre ON public.dj_music_tracks(music_genre);
