-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Communication Modes Table
CREATE TABLE IF NOT EXISTS public.communication_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Community Posts Table (Forum-style discussions)
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Community Post Replies (Threaded discussions)
CREATE TABLE IF NOT EXISTS public.community_post_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES public.community_post_replies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Post Votes (Track who voted)
CREATE TABLE IF NOT EXISTS public.community_post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES public.community_post_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id),
  UNIQUE(reply_id, user_id)
);

-- Classroom Sessions Table
CREATE TABLE IF NOT EXISTS public.classroom_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL,
  instructor_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_participants INTEGER DEFAULT 30,
  whiteboard_data JSONB DEFAULT '{}'::JSONB,
  recording_url TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lecture Halls Table
CREATE TABLE IF NOT EXISTS public.lecture_halls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  presenter_id UUID NOT NULL,
  presenter_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  slides_url TEXT,
  recording_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 90,
  attendees_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training Courses Table
CREATE TABLE IF NOT EXISTS public.training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL,
  instructor_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  total_modules INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  completion_certificate BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  price_usdt NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Training Course Modules
CREATE TABLE IF NOT EXISTS public.training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  video_url TEXT,
  resources JSONB DEFAULT '[]'::JSONB,
  xp_reward INTEGER DEFAULT 50,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Training Progress Table
CREATE TABLE IF NOT EXISTS public.training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.training_courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.training_modules(id) ON DELETE CASCADE,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed BOOLEAN DEFAULT false,
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id, module_id)
);

-- Radio Broadcasts Table
CREATE TABLE IF NOT EXISTS public.radio_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  broadcaster_id UUID NOT NULL,
  broadcaster_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  stream_url TEXT,
  recording_url TEXT,
  thumbnail_url TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  listener_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User XP Table (Gamification)
CREATE TABLE IF NOT EXISTS public.user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_level_xp INTEGER DEFAULT 0,
  next_level_xp INTEGER DEFAULT 100,
  badges TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Feed Table (Unified feed across all modes)
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode_type TEXT NOT NULL CHECK (mode_type IN ('chat', 'community', 'classroom', 'lecture', 'training', 'radio')),
  action_type TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  content TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_circle_id ON public.community_posts(circle_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_post_replies_post_id ON public.community_post_replies(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_votes_post_id ON public.community_post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_votes_user_id ON public.community_post_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_classroom_sessions_circle_id ON public.classroom_sessions(circle_id);
CREATE INDEX IF NOT EXISTS idx_lecture_halls_circle_id ON public.lecture_halls(circle_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_circle_id ON public.training_courses(circle_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_user_id ON public.training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_radio_broadcasts_circle_id ON public.radio_broadcasts(circle_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON public.activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON public.activity_feed(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.communication_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communication_modes (Public read)
CREATE POLICY "Anyone can view active communication modes"
  ON public.communication_modes FOR SELECT
  USING (is_active = true);

-- RLS Policies for community_posts
CREATE POLICY "Users can view posts in their circles"
  ON public.community_posts FOR SELECT
  USING (
    circle_id IN (
      SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create posts in their circles"
  ON public.community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    circle_id IN (
      SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own posts"
  ON public.community_posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for community_post_replies
CREATE POLICY "Users can view replies to posts in their circles"
  ON public.community_post_replies FOR SELECT
  USING (
    post_id IN (
      SELECT id FROM public.community_posts WHERE circle_id IN (
        SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create replies in their circles"
  ON public.community_post_replies FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    post_id IN (
      SELECT id FROM public.community_posts WHERE circle_id IN (
        SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own replies"
  ON public.community_post_replies FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own replies"
  ON public.community_post_replies FOR DELETE
  USING (auth.uid() = author_id);

-- RLS Policies for community_post_votes
CREATE POLICY "Users can view votes"
  ON public.community_post_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own votes"
  ON public.community_post_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON public.community_post_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON public.community_post_votes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for classroom_sessions
CREATE POLICY "Users can view sessions in their circles"
  ON public.classroom_sessions FOR SELECT
  USING (
    circle_id IN (
      SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can create sessions"
  ON public.classroom_sessions FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors can update their sessions"
  ON public.classroom_sessions FOR UPDATE
  USING (auth.uid() = instructor_id);

-- RLS Policies for lecture_halls
CREATE POLICY "Users can view lectures in their circles"
  ON public.lecture_halls FOR SELECT
  USING (
    circle_id IN (
      SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Presenters can create lectures"
  ON public.lecture_halls FOR INSERT
  WITH CHECK (auth.uid() = presenter_id);

CREATE POLICY "Presenters can update their lectures"
  ON public.lecture_halls FOR UPDATE
  USING (auth.uid() = presenter_id);

-- RLS Policies for training_courses
CREATE POLICY "Users can view public courses or courses in their circles"
  ON public.training_courses FOR SELECT
  USING (
    is_public = true OR
    circle_id IN (
      SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can create courses"
  ON public.training_courses FOR INSERT
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors can update their courses"
  ON public.training_courses FOR UPDATE
  USING (auth.uid() = instructor_id);

-- RLS Policies for training_modules
CREATE POLICY "Users can view modules of accessible courses"
  ON public.training_modules FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.training_courses WHERE 
        is_public = true OR
        circle_id IN (
          SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Instructors can manage their course modules"
  ON public.training_modules FOR ALL
  USING (
    course_id IN (
      SELECT id FROM public.training_courses WHERE instructor_id = auth.uid()
    )
  );

-- RLS Policies for training_progress
CREATE POLICY "Users can view their own progress"
  ON public.training_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress"
  ON public.training_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.training_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for radio_broadcasts
CREATE POLICY "Users can view broadcasts in their circles"
  ON public.radio_broadcasts FOR SELECT
  USING (
    circle_id IN (
      SELECT circle_id FROM public.circle_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Broadcasters can create broadcasts"
  ON public.radio_broadcasts FOR INSERT
  WITH CHECK (auth.uid() = broadcaster_id);

CREATE POLICY "Broadcasters can update their broadcasts"
  ON public.radio_broadcasts FOR UPDATE
  USING (auth.uid() = broadcaster_id);

-- RLS Policies for user_xp
CREATE POLICY "Users can view their own XP"
  ON public.user_xp FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view others' XP"
  ON public.user_xp FOR SELECT
  USING (true);

CREATE POLICY "System can manage XP"
  ON public.user_xp FOR ALL
  USING (true);

-- RLS Policies for achievements
CREATE POLICY "Users can view their own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (true);

-- RLS Policies for activity_feed
CREATE POLICY "Users can view their own activity feed"
  ON public.activity_feed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create activity feed items"
  ON public.activity_feed FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their read status"
  ON public.activity_feed FOR UPDATE
  USING (auth.uid() = user_id);

-- Insert default communication modes
INSERT INTO public.communication_modes (name, icon, description, sort_order) VALUES
  ('1-on-1 Chats', '💬', 'Private one-on-one conversations', 1),
  ('Community Forums', '👥', 'Topic-based group discussions', 2),
  ('Classrooms', '📚', 'Interactive learning sessions', 3),
  ('Lecture Halls', '🎓', 'Presentation and lecture spaces', 4),
  ('Training Sessions', '🏋️', 'Skill development courses', 5),
  ('Radio Broadcasts', '📻', 'Live audio streaming', 6)
ON CONFLICT (name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_community_posts_updated_at BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_community_post_replies_updated_at BEFORE UPDATE ON public.community_post_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classroom_sessions_updated_at BEFORE UPDATE ON public.classroom_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecture_halls_updated_at BEFORE UPDATE ON public.lecture_halls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_courses_updated_at BEFORE UPDATE ON public.training_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_progress_updated_at BEFORE UPDATE ON public.training_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_radio_broadcasts_updated_at BEFORE UPDATE ON public.radio_broadcasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_xp_updated_at BEFORE UPDATE ON public.user_xp
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();