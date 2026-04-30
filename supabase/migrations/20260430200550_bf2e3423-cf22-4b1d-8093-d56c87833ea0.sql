-- Add wandering_role identity to music, video, and book uploads so the marketplace
-- taxonomy + identity badges can be applied consistently across all listing types.

ALTER TABLE public.dj_music_tracks
  ADD COLUMN IF NOT EXISTS wandering_role text;

ALTER TABLE public.community_videos
  ADD COLUMN IF NOT EXISTS wandering_role text;

ALTER TABLE public.sower_books
  ADD COLUMN IF NOT EXISTS wandering_role text;

CREATE INDEX IF NOT EXISTS idx_dj_music_tracks_wandering_role
  ON public.dj_music_tracks (wandering_role);
CREATE INDEX IF NOT EXISTS idx_community_videos_wandering_role
  ON public.community_videos (wandering_role);
CREATE INDEX IF NOT EXISTS idx_sower_books_wandering_role
  ON public.sower_books (wandering_role);