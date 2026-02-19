
-- Phase 4: S2G Music Integration

-- 1. Radio seed plays tracking + XP
CREATE TABLE public.radio_seed_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.radio_schedule(id) ON DELETE SET NULL,
  seed_id UUID,
  track_id UUID REFERENCES public.dj_music_tracks(id) ON DELETE SET NULL,
  sower_id UUID,
  dj_id UUID REFERENCES public.radio_djs(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INT,
  source TEXT NOT NULL DEFAULT 'playlist' CHECK (source IN ('playlist', 'request', 'segment'))
);

ALTER TABLE public.radio_seed_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seed plays" ON public.radio_seed_plays FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert seed plays" ON public.radio_seed_plays FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE INDEX idx_radio_seed_plays_session ON public.radio_seed_plays(session_id);
CREATE INDEX idx_radio_seed_plays_seed ON public.radio_seed_plays(seed_id);
CREATE INDEX idx_radio_seed_plays_sower ON public.radio_seed_plays(sower_id);

-- 2. Seed request queue
CREATE TABLE public.radio_seed_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  seed_id UUID,
  track_id UUID REFERENCES public.dj_music_tracks(id) ON DELETE SET NULL,
  seed_title TEXT NOT NULL,
  seed_artist TEXT,
  seed_cover_url TEXT,
  seed_file_url TEXT,
  seed_duration_seconds INT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'played', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.radio_seed_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seed requests" ON public.radio_seed_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can request seeds" ON public.radio_seed_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "DJs can update seed requests" ON public.radio_seed_requests FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_radio_seed_requests_session ON public.radio_seed_requests(session_id);

-- 3. Function to award XP when a seed is played on radio
CREATE OR REPLACE FUNCTION public.award_radio_play_xp()
RETURNS TRIGGER AS $$
BEGIN
  -- Award 10 XP to the sower when their seed is played
  IF NEW.sower_id IS NOT NULL THEN
    UPDATE public.user_points 
    SET total_points = total_points + 10,
        updated_at = now()
    WHERE user_id = NEW.sower_id;
    
    -- If no row exists, insert one
    IF NOT FOUND THEN
      INSERT INTO public.user_points (user_id, total_points)
      VALUES (NEW.sower_id, 10)
      ON CONFLICT (user_id) DO UPDATE SET total_points = user_points.total_points + 10;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_award_radio_play_xp
AFTER INSERT ON public.radio_seed_plays
FOR EACH ROW
EXECUTE FUNCTION public.award_radio_play_xp();
