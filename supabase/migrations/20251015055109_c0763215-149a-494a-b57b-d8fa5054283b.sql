-- Update RLS policies to allow co-hosts to manage documents and music

-- Allow co-hosts (moderators) to upload documents to chat rooms
DROP POLICY IF EXISTS "Room moderators can upload documents" ON chat_room_documents;
CREATE POLICY "Room moderators and creators can upload documents"
ON chat_room_documents FOR INSERT
WITH CHECK (
  auth.uid() = uploader_id AND (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.room_id = chat_room_documents.room_id
      AND cp.user_id = auth.uid()
      AND cp.is_moderator = true
      AND cp.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM chat_rooms cr
      WHERE cr.id = chat_room_documents.room_id
      AND cr.created_by = auth.uid()
    )
  )
);

-- Allow co-hosts (moderators) to manage playlists in chat rooms
DROP POLICY IF EXISTS "Room moderators can manage playlists" ON room_playlists;
CREATE POLICY "Room moderators and creators can manage playlists"
ON room_playlists FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.room_id = room_playlists.room_id
    AND cp.user_id = auth.uid()
    AND cp.is_moderator = true
    AND cp.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.id = room_playlists.room_id
    AND cr.created_by = auth.uid()
  )
);

-- Allow radio co-hosts to upload music tracks
DROP POLICY IF EXISTS "DJs can manage their own tracks" ON dj_music_tracks;
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

-- Update policy for viewing music tracks
DROP POLICY IF EXISTS "Authenticated users can view public tracks" ON dj_music_tracks;
CREATE POLICY "Users can view accessible tracks"
ON dj_music_tracks FOR SELECT
USING (
  auth.uid() IS NOT NULL
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
DROP POLICY IF EXISTS "DJs and co-hosts can manage playlist tracks" ON dj_playlist_tracks;
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
DROP POLICY IF EXISTS "DJs can manage their own playlists" ON dj_playlists;
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
);