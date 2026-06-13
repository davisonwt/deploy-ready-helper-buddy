DROP POLICY IF EXISTS "Authenticated users can view all tracks for voting" ON public.dj_music_tracks;

CREATE POLICY "Authenticated users can view public tracks"
  ON public.dj_music_tracks
  FOR SELECT
  TO authenticated
  USING (is_public = true);