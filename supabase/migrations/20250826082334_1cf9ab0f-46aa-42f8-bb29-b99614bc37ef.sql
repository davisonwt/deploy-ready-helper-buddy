-- Create playlist tracks table (only if not exists)
CREATE TABLE IF NOT EXISTS public.dj_playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  artist TEXT,
  title TEXT,
  album TEXT,
  genre TEXT,
  bpm INTEGER,
  track_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.dj_playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for playlist tracks (only if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dj_playlist_tracks' 
    AND policyname = 'DJs can manage tracks in their playlists'
  ) THEN
    CREATE POLICY "DJs can manage tracks in their playlists" 
    ON public.dj_playlist_tracks 
    FOR ALL 
    USING (
      playlist_id IN (
        SELECT dp.id 
        FROM dj_playlists dp 
        JOIN radio_djs rd ON dp.dj_id = rd.id 
        WHERE rd.user_id = auth.uid()
      ) OR
      has_role(auth.uid(), 'radio_admin'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'gosat'::app_role)
    );
  END IF;
END $$;

-- Create function to update playlist duration (only if not exists)
CREATE OR REPLACE FUNCTION public.update_playlist_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Update playlist total duration and track count
  UPDATE dj_playlists 
  SET 
    total_duration_seconds = (
      SELECT COALESCE(SUM(duration_seconds), 0) 
      FROM dj_playlist_tracks 
      WHERE playlist_id = COALESCE(NEW.playlist_id, OLD.playlist_id) 
      AND is_active = true
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
$$ LANGUAGE plpgsql;

-- Create trigger for playlist updates (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_playlist_on_track_change ON public.dj_playlist_tracks;
CREATE TRIGGER update_playlist_on_track_change
  AFTER INSERT OR UPDATE OR DELETE ON public.dj_playlist_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_playlist_duration();