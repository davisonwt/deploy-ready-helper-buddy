-- GROVE STATION: 24/7 Community Radio Station
-- Create comprehensive radio station management system

-- Create radio station configuration table
CREATE TABLE public.radio_station_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL DEFAULT 'Grove Station',
  station_description text DEFAULT 'Your 24/7 community radio station growing together',
  station_tagline text DEFAULT 'Where ideas bloom and voices grow',
  is_live boolean NOT NULL DEFAULT true,
  current_show_id uuid,
  emergency_mode boolean DEFAULT false,
  ai_dj_enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create DJ roles enum
CREATE TYPE dj_role AS ENUM ('dj', 'program_director', 'station_manager', 'ai_host');

-- Create DJ profiles table
CREATE TABLE public.radio_djs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dj_name text NOT NULL,
  bio text,
  avatar_url text,
  dj_role dj_role NOT NULL DEFAULT 'dj',
  specialties text[],
  preferred_time_slots text[], -- Array of preferred hours like ['14:00', '15:00']
  is_active boolean NOT NULL DEFAULT true,
  total_hours_hosted integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 5.0,
  emergency_availability boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create show categories
CREATE TYPE show_category AS ENUM (
  'music', 'talk', 'educational', 'community', 'news', 
  'comedy', 'spiritual', 'business', 'ai_generated', 'live_call_in'
);

-- Create radio shows table
CREATE TABLE public.radio_shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_name text NOT NULL,
  description text,
  category show_category NOT NULL DEFAULT 'music',
  dj_id uuid REFERENCES public.radio_djs(id),
  is_recurring boolean DEFAULT false,
  recurring_pattern jsonb, -- Days of week, duration, etc.
  show_image_url text,
  tags text[],
  estimated_listeners integer DEFAULT 0,
  total_episodes integer DEFAULT 0,
  is_live boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create time slots scheduling table
CREATE TABLE public.radio_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid REFERENCES public.radio_shows(id),
  dj_id uuid REFERENCES public.radio_djs(id),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  time_slot_date date NOT NULL,
  hour_slot integer NOT NULL CHECK (hour_slot >= 0 AND hour_slot <= 23),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled', 'no_show')),
  show_notes text,
  playlist_url text,
  listener_count integer DEFAULT 0,
  ai_backup_enabled boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(time_slot_date, hour_slot)
);

-- Create listener feedback table
CREATE TABLE public.radio_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.radio_schedule(id),
  listener_user_id uuid,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  feedback_type text DEFAULT 'general' CHECK (feedback_type IN ('general', 'content', 'audio_quality', 'dj_performance')),
  is_anonymous boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create radio station stats table
CREATE TABLE public.radio_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT current_date,
  hour_slot integer NOT NULL CHECK (hour_slot >= 0 AND hour_slot <= 23),
  total_listeners integer DEFAULT 0,
  peak_listeners integer DEFAULT 0,
  show_id uuid REFERENCES public.radio_shows(id),
  dj_id uuid REFERENCES public.radio_djs(id),
  audio_quality_score numeric(3,2),
  engagement_score numeric(3,2),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(date, hour_slot)
);

-- Enable RLS on all radio tables
ALTER TABLE public.radio_station_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for radio station config (admins only)
CREATE POLICY "Admins can manage station config" ON public.radio_station_config
  FOR ALL USING (is_admin_or_gosat(auth.uid()));

CREATE POLICY "Everyone can view station config" ON public.radio_station_config
  FOR SELECT USING (true);

-- RLS Policies for radio DJs
CREATE POLICY "Users can view all DJs" ON public.radio_djs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create their own DJ profile" ON public.radio_djs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own DJ profile" ON public.radio_djs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all DJ profiles" ON public.radio_djs
  FOR ALL USING (is_admin_or_gosat(auth.uid()));

-- RLS Policies for radio shows
CREATE POLICY "Everyone can view active shows" ON public.radio_shows
  FOR SELECT USING (true);

CREATE POLICY "DJs can create shows" ON public.radio_shows
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.radio_djs WHERE id = dj_id)
  );

CREATE POLICY "DJs can update their own shows" ON public.radio_shows
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.radio_djs WHERE id = dj_id)
  );

CREATE POLICY "Admins can manage all shows" ON public.radio_shows
  FOR ALL USING (is_admin_or_gosat(auth.uid()));

-- RLS Policies for radio schedule
CREATE POLICY "Everyone can view schedule" ON public.radio_schedule
  FOR SELECT USING (true);

CREATE POLICY "DJs can create their own schedule slots" ON public.radio_schedule
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.radio_djs WHERE id = dj_id)
  );

CREATE POLICY "DJs can update their own schedule slots" ON public.radio_schedule
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.radio_djs WHERE id = dj_id)
  );

CREATE POLICY "Admins can manage all schedule slots" ON public.radio_schedule
  FOR ALL USING (is_admin_or_gosat(auth.uid()));

-- RLS Policies for feedback
CREATE POLICY "Everyone can submit feedback" ON public.radio_feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own feedback" ON public.radio_feedback
  FOR SELECT USING (auth.uid() = listener_user_id);

CREATE POLICY "DJs can view feedback for their shows" ON public.radio_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.radio_schedule rs
      JOIN public.radio_djs rd ON rs.dj_id = rd.id
      WHERE rs.id = schedule_id AND rd.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all feedback" ON public.radio_feedback
  FOR SELECT USING (is_admin_or_gosat(auth.uid()));

-- RLS Policies for radio stats
CREATE POLICY "Everyone can view stats" ON public.radio_stats
  FOR SELECT USING (true);

CREATE POLICY "System can insert stats" ON public.radio_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage stats" ON public.radio_stats
  FOR ALL USING (is_admin_or_gosat(auth.uid()));

-- Create helper functions
CREATE OR REPLACE FUNCTION public.get_current_radio_show()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'schedule_id', rs.id,
    'show_name', sh.show_name,
    'dj_name', dj.dj_name,
    'dj_avatar', dj.avatar_url,
    'category', sh.category,
    'description', sh.description,
    'start_time', rs.start_time,
    'end_time', rs.end_time,
    'status', rs.status,
    'listener_count', rs.listener_count,
    'is_live', (rs.status = 'live')
  )
  FROM public.radio_schedule rs
  JOIN public.radio_shows sh ON rs.show_id = sh.id
  JOIN public.radio_djs dj ON rs.dj_id = dj.id
  WHERE rs.start_time <= now() 
    AND rs.end_time > now() 
    AND rs.status IN ('scheduled', 'live')
  ORDER BY rs.start_time DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_radio_schedule_for_date(target_date date DEFAULT current_date)
RETURNS TABLE(
  hour_slot integer,
  schedule_id uuid,
  show_name text,
  dj_name text,
  dj_avatar text,
  category show_category,
  status text,
  is_live boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    rs.hour_slot,
    rs.id as schedule_id,
    COALESCE(sh.show_name, 'AI Radio Host') as show_name,
    COALESCE(dj.dj_name, 'Grove AI') as dj_name,
    COALESCE(dj.avatar_url, '/ai-dj-avatar.png') as dj_avatar,
    COALESCE(sh.category, 'ai_generated'::show_category) as category,
    COALESCE(rs.status, 'ai_backup') as status,
    COALESCE((rs.status = 'live'), false) as is_live
  FROM generate_series(0, 23) as hour_slot
  LEFT JOIN public.radio_schedule rs ON rs.time_slot_date = target_date AND rs.hour_slot = hour_slot.hour_slot
  LEFT JOIN public.radio_shows sh ON rs.show_id = sh.id
  LEFT JOIN public.radio_djs dj ON rs.dj_id = dj.id
  ORDER BY hour_slot;
$$;

-- Insert default station configuration
INSERT INTO public.radio_station_config (station_name, station_description, station_tagline, ai_dj_enabled) 
VALUES (
  'Grove Station', 
  'Your 24/7 community radio station where ideas bloom and voices grow. Join our thriving community of creators, thinkers, and dreamers as we cultivate conversations that matter.',
  '🌱 Where Ideas Bloom & Voices Grow 🎵',
  true
);

-- Create default AI DJ profile
INSERT INTO public.radio_djs (user_id, dj_name, bio, dj_role, specialties, emergency_availability) 
VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- Use first available user as system user
  'Grove AI',
  'Your friendly AI radio host, always ready to keep the station alive with curated music, community updates, and engaging conversations. I never sleep, so Grove Station never stops growing!',
  'ai_host',
  ARRAY['music_curation', 'community_updates', 'emergency_broadcasting', 'smooth_transitions'],
  true
);

-- Create some default show templates
INSERT INTO public.radio_shows (show_name, description, category) VALUES
('Morning Grove', 'Start your day right with uplifting music and community news', 'music'),
('Community Spotlight', 'Featuring local creators and their amazing orchards', 'community'),
('Growth Sessions', 'Educational content to help you cultivate success', 'educational'),
('Late Night Roots', 'Chill vibes for the night owls in our community', 'music'),
('AI Curated Mix', 'Intelligent music selection powered by community preferences', 'ai_generated');

-- Add triggers for automatic stats tracking
CREATE OR REPLACE FUNCTION public.update_radio_stats()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Update stats when schedule status changes
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO public.radio_stats (date, hour_slot, show_id, dj_id, total_listeners)
    VALUES (NEW.time_slot_date, NEW.hour_slot, NEW.show_id, NEW.dj_id, NEW.listener_count)
    ON CONFLICT (date, hour_slot) 
    DO UPDATE SET 
      total_listeners = GREATEST(public.radio_stats.total_listeners, NEW.listener_count),
      peak_listeners = GREATEST(public.radio_stats.peak_listeners, NEW.listener_count),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_radio_stats_trigger
  AFTER UPDATE ON public.radio_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_radio_stats();