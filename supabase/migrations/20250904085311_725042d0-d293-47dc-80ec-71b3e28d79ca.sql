-- Fix the update_playlist_duration function to properly join with dj_music_tracks
CREATE OR REPLACE FUNCTION update_playlist_duration()
RETURNS trigger AS $$
BEGIN
  -- Update playlist total duration and track count
  UPDATE dj_playlists 
  SET 
    total_duration_seconds = (
      SELECT COALESCE(SUM(dmt.duration_seconds), 0) 
      FROM dj_playlist_tracks plt
      JOIN dj_music_tracks dmt ON plt.track_id = dmt.id
      WHERE plt.playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id) 
      AND plt.is_active = true
    ),
    track_count = (
      SELECT COUNT(*) 
      FROM dj_playlist_tracks 
      WHERE playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id) 
      AND is_active = true
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.playlist_id, OLD.playlist_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;