-- 364ttt Weekly Torah Top Ten Feature Tables

-- Table to store user votes for songs
CREATE TABLE public.song_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.dj_music_tracks(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL, -- Format: "YYYY_WW" e.g. "6028_27"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one vote per user per song per week
  CONSTRAINT unique_user_song_week UNIQUE (user_id, song_id, week_id)
);

-- Table to store weekly playlists (top 10 albums)
CREATE TABLE public.weekly_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id TEXT NOT NULL UNIQUE, -- Format: "YYYY_WW" e.g. "6028_27"
  title TEXT NOT NULL, -- e.g. "364ttt Week 27 – Feast of Trumpets Edition"
  theme TEXT, -- Optional theme
  song_ids UUID[] NOT NULL, -- Ordered array of song IDs (1st to 10th)
  rank_data JSONB NOT NULL DEFAULT '[]', -- Array of {song_id, vote_count, rank}
  total_votes INTEGER NOT NULL DEFAULT 0,
  total_voters INTEGER NOT NULL DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_song_votes_week ON public.song_votes(week_id);
CREATE INDEX idx_song_votes_song ON public.song_votes(song_id);
CREATE INDEX idx_song_votes_user_week ON public.song_votes(user_id, week_id);
CREATE INDEX idx_weekly_playlists_week ON public.weekly_playlists(week_id);

-- Enable RLS
ALTER TABLE public.song_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_playlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for song_votes
-- Users can view all votes (for leaderboard)
CREATE POLICY "Anyone can view vote counts" 
ON public.song_votes FOR SELECT 
USING (true);

-- Only authenticated users can insert their own votes
CREATE POLICY "Authenticated users can vote" 
ON public.song_votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can remove their own votes" 
ON public.song_votes FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for weekly_playlists
-- Everyone can view playlists
CREATE POLICY "Anyone can view weekly playlists" 
ON public.weekly_playlists FOR SELECT 
USING (true);

-- Only service role can insert (via edge function)
CREATE POLICY "Service role can create playlists" 
ON public.weekly_playlists FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
));

-- Function to get current week ID based on Creator calendar
CREATE OR REPLACE FUNCTION public.get_current_week_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_days_since_epoch INTEGER;
  v_year INTEGER;
  v_week INTEGER;
BEGIN
  -- Calculate days since epoch (March 20, 2025 = Year 6028 Day 1)
  -- Using sunrise at 05:13 as day boundary
  v_days_since_epoch := EXTRACT(EPOCH FROM (
    CASE 
      WHEN EXTRACT(HOUR FROM now()) * 60 + EXTRACT(MINUTE FROM now()) < 313 
      THEN now() - INTERVAL '1 day'
      ELSE now()
    END
  ) - TIMESTAMP '2025-03-20 05:13:00') / 86400;
  
  -- Calculate year (364 days per year)
  v_year := 6028 + (v_days_since_epoch / 364);
  
  -- Calculate week (7 days per week, 52 weeks per year)
  v_week := ((v_days_since_epoch % 364) / 7) + 1;
  
  -- Clamp week to 1-52
  IF v_week > 52 THEN v_week := 52; END IF;
  IF v_week < 1 THEN v_week := 1; END IF;
  
  RETURN v_year || '_' || LPAD(v_week::TEXT, 2, '0');
END;
$$;

-- Function to get vote count for a song in current week
CREATE OR REPLACE FUNCTION public.get_song_vote_count(song_id_param UUID, week_id_param TEXT DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_id TEXT;
  v_count INTEGER;
BEGIN
  v_week_id := COALESCE(week_id_param, get_current_week_id());
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.song_votes
  WHERE song_id = song_id_param AND week_id = v_week_id;
  RETURN v_count;
END;
$$;

-- Function to get user's remaining votes for current week
CREATE OR REPLACE FUNCTION public.get_user_remaining_votes(user_id_param UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_week_id TEXT;
  v_used_votes INTEGER;
BEGIN
  v_user_id := COALESCE(user_id_param, auth.uid());
  IF v_user_id IS NULL THEN RETURN 0; END IF;
  
  v_week_id := get_current_week_id();
  SELECT COUNT(*)::INTEGER INTO v_used_votes
  FROM public.song_votes
  WHERE user_id = v_user_id AND week_id = v_week_id;
  
  RETURN GREATEST(0, 10 - v_used_votes);
END;
$$;

-- Function to get current week's top songs leaderboard
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  song_id UUID,
  track_title TEXT,
  artist_name TEXT,
  file_url TEXT,
  vote_count BIGINT,
  rank BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_id TEXT;
BEGIN
  v_week_id := get_current_week_id();
  
  RETURN QUERY
  SELECT 
    t.id AS song_id,
    t.track_title,
    t.artist_name,
    t.file_url,
    COUNT(v.id) AS vote_count,
    ROW_NUMBER() OVER (ORDER BY COUNT(v.id) DESC, t.created_at ASC) AS rank
  FROM public.dj_music_tracks t
  LEFT JOIN public.song_votes v ON t.id = v.song_id AND v.week_id = v_week_id
  GROUP BY t.id, t.track_title, t.artist_name, t.file_url, t.created_at
  HAVING COUNT(v.id) > 0
  ORDER BY vote_count DESC, t.created_at ASC
  LIMIT limit_count;
END;
$$;

-- Enable realtime for song_votes
ALTER PUBLICATION supabase_realtime ADD TABLE song_votes;
ALTER TABLE song_votes REPLICA IDENTITY FULL;