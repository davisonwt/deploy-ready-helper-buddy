-- Drop the overly restrictive policies and create clearer ones
DROP POLICY IF EXISTS "Anyone can view public music tracks" ON dj_music_tracks;
DROP POLICY IF EXISTS "Users can view accessible tracks" ON dj_music_tracks;

-- Create a simple, clear policy: authenticated users can view all public tracks
CREATE POLICY "Authenticated users can view all public tracks"
  ON dj_music_tracks
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Allow anyone (including anonymous) to view public tracks
CREATE POLICY "Anyone can view public tracks"
  ON dj_music_tracks
  FOR SELECT
  TO anon
  USING (is_public = true);

-- DJs can view all their own tracks (public or private)
CREATE POLICY "DJs can view their own tracks"
  ON dj_music_tracks
  FOR SELECT
  USING (
    dj_id IN (
      SELECT id FROM radio_djs WHERE user_id = auth.uid()
    )
  );
