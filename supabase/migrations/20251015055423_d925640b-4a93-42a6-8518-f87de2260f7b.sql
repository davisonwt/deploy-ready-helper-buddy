-- Update RLS policies to allow co-hosts to manage music

-- Remove old policies first
DROP POLICY IF EXISTS "DJs and accepted co-hosts can upload music tracks" ON dj_music_tracks;
DROP POLICY IF EXISTS "DJs and accepted co-hosts can update tracks" ON dj_music_tracks;
DROP POLICY IF EXISTS "DJs and accepted co-hosts can delete tracks" ON dj_music_tracks;
DROP POLICY IF EXISTS "DJs and accepted co-hosts can manage playlist tracks" ON dj_playlist_tracks;
DROP POLICY IF EXISTS "DJs and accepted co-hosts can manage playlists" ON dj_playlists;

-- Allow radio co-hosts to upload music tracks
CREATE POLICY "DJs and accepted co-hosts can upload music tracks"
ON dj_music_tracks FOR INSERT
WITH CHECK (
  dj_id IN (
    SELECT radio_djs.id FROM radio_djs WHERE radio_djs.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM radio_co_host_invites rchi
    JOIN radio_schedule rs ON rchi.schedule_id = rs.id
    WHERE rs.dj_id = dj_music_tracks.dj_id
    AND rchi.co_host_user_id = auth.uid()
    AND rchi.status = 'accepted'
  )
);

-- Allow co-hosts to update tracks
CREATE POLICY "DJs and accepted co-hosts can update tracks"
ON dj_music_tracks FOR UPDATE
USING (
  dj_id IN (SELECT radio_djs.id FROM radio_djs WHERE radio_djs.user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM radio_co_host_invites rchi
    JOIN radio_schedule rs ON rchi.schedule_id = rs.id
    WHERE rs.dj_id = dj_music_tracks.dj_id
    AND rchi.co_host_user_id = auth.uid()
    AND rchi.status = 'accepted'
  )
);

-- Allow co-hosts to delete tracks
CREATE POLICY "DJs and accepted co-hosts can delete tracks"
ON dj_music_tracks FOR DELETE
USING (
  dj_id IN (SELECT radio_djs.id FROM radio_djs WHERE radio_djs.user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM radio_co_host_invites rchi
    JOIN radio_schedule rs ON rchi.schedule_id = rs.id
    WHERE rs.dj_id = dj_music_tracks.dj_id
    AND rchi.co_host_user_id = auth.uid()
    AND rchi.status = 'accepted'
  )
);

-- Update playlist tracks policy for co-hosts
CREATE POLICY "DJs and accepted co-hosts can manage playlist tracks"
ON dj_playlist_tracks FOR ALL
USING (
  playlist_id IN (
    SELECT dp.id FROM dj_playlists dp
    JOIN radio_djs rd ON dp.dj_id = rd.id
    WHERE rd.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM dj_playlists dp
    JOIN radio_djs rd ON dp.dj_id = rd.id
    JOIN radio_schedule rs ON rs.dj_id = rd.id
    JOIN radio_co_host_invites rchi ON rchi.schedule_id = rs.id
    WHERE dp.id = dj_playlist_tracks.playlist_id
    AND rchi.co_host_user_id = auth.uid()
    AND rchi.status = 'accepted'
  )
  OR
  has_role(auth.uid(), 'radio_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gosat'::app_role)
);

-- Update playlists policy for co-hosts
CREATE POLICY "DJs and accepted co-hosts can manage playlists"
ON dj_playlists FOR ALL
USING (
  dj_id IN (SELECT radio_djs.id FROM radio_djs WHERE radio_djs.user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM radio_djs rd
    JOIN radio_schedule rs ON rs.dj_id = rd.id
    JOIN radio_co_host_invites rchi ON rchi.schedule_id = rs.id
    WHERE rd.id = dj_playlists.dj_id
    AND rchi.co_host_user_id = auth.uid()
    AND rchi.status = 'accepted'
  )
  OR
  is_public = true
);