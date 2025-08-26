-- Create storage bucket for music files
INSERT INTO storage.buckets (id, name, public) VALUES ('radio-music', 'radio-music', false);

-- Create policies for music uploads
CREATE POLICY "DJs can upload music files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'radio-music' AND 
  (
    auth.uid() IN (SELECT user_id FROM radio_djs WHERE is_active = true) OR
    has_role(auth.uid(), 'radio_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  )
);

CREATE POLICY "DJs can view music files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'radio-music' AND 
  (
    auth.uid() IN (SELECT user_id FROM radio_djs WHERE is_active = true) OR
    has_role(auth.uid(), 'radio_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  )
);

CREATE POLICY "DJs can update their own music files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'radio-music' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'radio_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  )
);

CREATE POLICY "DJs can delete their own music files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'radio-music' AND 
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    has_role(auth.uid(), 'radio_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  )
);

-- Create playlist tracks table
CREATE TABLE public.dj_playlist_tracks (
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

-- Enable RLS
ALTER TABLE public.dj_playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for playlist tracks
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

CREATE POLICY "Users can view tracks in public playlists" 
ON public.dj_playlist_tracks 
FOR SELECT 
USING (
  is_active = true AND 
  playlist_id IN (
    SELECT id FROM dj_playlists WHERE is_public = true
  )
);

-- Create function to update playlist duration
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

-- Create triggers for playlist updates
CREATE TRIGGER update_playlist_on_track_change
  AFTER INSERT OR UPDATE OR DELETE ON public.dj_playlist_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_playlist_duration();

-- Create function to auto-order tracks
CREATE OR REPLACE FUNCTION public.auto_order_playlist_tracks()
RETURNS TRIGGER AS $$
BEGIN
  -- If no track_order specified, set it to the next available number
  IF NEW.track_order = 0 THEN
    NEW.track_order := (
      SELECT COALESCE(MAX(track_order), 0) + 1 
      FROM dj_playlist_tracks 
      WHERE playlist_id = NEW.playlist_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-ordering
CREATE TRIGGER auto_order_tracks
  BEFORE INSERT ON public.dj_playlist_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_order_playlist_tracks();