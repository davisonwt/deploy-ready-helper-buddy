-- Create tables for DJ music and playlist management
-- Table to store individual music tracks uploaded by DJs
CREATE TABLE public.dj_music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dj_id UUID NOT NULL,
  track_title TEXT NOT NULL,
  artist_name TEXT,
  duration_seconds INTEGER,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  track_type TEXT NOT NULL DEFAULT 'music', -- 'music', 'jingle', 'voiceover', 'full_session'
  tags TEXT[],
  is_explicit BOOLEAN DEFAULT false,
  bpm INTEGER,
  genre TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for DJ playlists
CREATE TABLE public.dj_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dj_id UUID NOT NULL,
  playlist_name TEXT NOT NULL,
  description TEXT,
  total_duration_seconds INTEGER DEFAULT 0,
  track_count INTEGER DEFAULT 0,
  playlist_type TEXT NOT NULL DEFAULT 'custom', -- 'custom', 'scheduled_session', 'backup'
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table for playlist tracks with order
CREATE TABLE public.dj_playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL,
  track_id UUID NOT NULL,
  track_order INTEGER NOT NULL,
  start_time_seconds INTEGER DEFAULT 0, -- For precise timing in automated sessions
  fade_in_seconds INTEGER DEFAULT 0,
  fade_out_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_order)
);

-- Table to link playlists to scheduled radio sessions for automated playback
CREATE TABLE public.radio_automated_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL,
  playlist_id UUID,
  session_type TEXT NOT NULL DEFAULT 'automated', -- 'automated', 'live_assisted'
  playback_status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'playing', 'paused', 'completed', 'failed'
  current_track_id UUID,
  current_position_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  listener_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.dj_music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_automated_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dj_music_tracks
CREATE POLICY "DJs can manage their own tracks"
ON public.dj_music_tracks
FOR ALL
USING (
  dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
);

CREATE POLICY "Authenticated users can view public tracks"
ON public.dj_music_tracks
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for dj_playlists  
CREATE POLICY "DJs can manage their own playlists"
ON public.dj_playlists
FOR ALL
USING (
  dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
);

CREATE POLICY "Users can view public playlists"
ON public.dj_playlists
FOR SELECT
USING (
  is_public = true OR 
  dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
);

-- RLS Policies for dj_playlist_tracks
CREATE POLICY "DJs can manage their playlist tracks"
ON public.dj_playlist_tracks
FOR ALL
USING (
  playlist_id IN (
    SELECT id FROM public.dj_playlists 
    WHERE dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can view playlist tracks for accessible playlists"
ON public.dj_playlist_tracks  
FOR SELECT
USING (
  playlist_id IN (
    SELECT id FROM public.dj_playlists 
    WHERE is_public = true OR 
    dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
  )
);

-- RLS Policies for radio_automated_sessions
CREATE POLICY "DJs can manage their automated sessions"
ON public.radio_automated_sessions
FOR ALL
USING (
  schedule_id IN (
    SELECT id FROM public.radio_schedule 
    WHERE dj_id IN (SELECT id FROM public.radio_djs WHERE user_id = auth.uid())
  ) OR
  has_role(auth.uid(), 'radio_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

CREATE POLICY "Authenticated users can view active automated sessions"
ON public.radio_automated_sessions
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND playback_status IN ('playing', 'scheduled')
);

-- Add foreign key constraints
ALTER TABLE public.dj_music_tracks 
ADD CONSTRAINT fk_dj_music_tracks_dj_id 
FOREIGN KEY (dj_id) REFERENCES public.radio_djs(id) ON DELETE CASCADE;

ALTER TABLE public.dj_playlists 
ADD CONSTRAINT fk_dj_playlists_dj_id 
FOREIGN KEY (dj_id) REFERENCES public.radio_djs(id) ON DELETE CASCADE;

ALTER TABLE public.dj_playlist_tracks 
ADD CONSTRAINT fk_dj_playlist_tracks_playlist_id 
FOREIGN KEY (playlist_id) REFERENCES public.dj_playlists(id) ON DELETE CASCADE;

ALTER TABLE public.dj_playlist_tracks 
ADD CONSTRAINT fk_dj_playlist_tracks_track_id 
FOREIGN KEY (track_id) REFERENCES public.dj_music_tracks(id) ON DELETE CASCADE;

ALTER TABLE public.radio_automated_sessions 
ADD CONSTRAINT fk_radio_automated_sessions_schedule_id 
FOREIGN KEY (schedule_id) REFERENCES public.radio_schedule(id) ON DELETE CASCADE;

ALTER TABLE public.radio_automated_sessions 
ADD CONSTRAINT fk_radio_automated_sessions_playlist_id 
FOREIGN KEY (playlist_id) REFERENCES public.dj_playlists(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_dj_music_tracks_dj_id ON public.dj_music_tracks(dj_id);
CREATE INDEX idx_dj_music_tracks_track_type ON public.dj_music_tracks(track_type);
CREATE INDEX idx_dj_playlists_dj_id ON public.dj_playlists(dj_id);
CREATE INDEX idx_dj_playlist_tracks_playlist_id ON public.dj_playlist_tracks(playlist_id);
CREATE INDEX idx_dj_playlist_tracks_order ON public.dj_playlist_tracks(playlist_id, track_order);
CREATE INDEX idx_radio_automated_sessions_schedule_id ON public.radio_automated_sessions(schedule_id);
CREATE INDEX idx_radio_automated_sessions_status ON public.radio_automated_sessions(playback_status);

-- Function to update playlist statistics
CREATE OR REPLACE FUNCTION public.update_playlist_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update playlist track count and total duration
  UPDATE public.dj_playlists 
  SET 
    track_count = (
      SELECT COUNT(*) 
      FROM public.dj_playlist_tracks plt
      JOIN public.dj_music_tracks dmt ON plt.track_id = dmt.id  
      WHERE plt.playlist_id = 
        CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.playlist_id
          ELSE NEW.playlist_id 
        END
    ),
    total_duration_seconds = (
      SELECT COALESCE(SUM(dmt.duration_seconds), 0)
      FROM public.dj_playlist_tracks plt
      JOIN public.dj_music_tracks dmt ON plt.track_id = dmt.id
      WHERE plt.playlist_id = 
        CASE 
          WHEN TG_OP = 'DELETE' THEN OLD.playlist_id  
          ELSE NEW.playlist_id
        END
    ),
    updated_at = now()
  WHERE id = 
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.playlist_id
      ELSE NEW.playlist_id
    END;
    
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for playlist stats
CREATE TRIGGER update_playlist_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.dj_playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION public.update_playlist_stats();