-- Create circles table for predefined circles
CREATE TABLE IF NOT EXISTS public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_circles table (which circles a user has access to)
CREATE TABLE IF NOT EXISTS public.user_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, circle_id)
);

-- Create circle_members table (people in each circle)
CREATE TABLE IF NOT EXISTS public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

-- Create message_streaks table for streak badges
CREATE TABLE IF NOT EXISTS public.message_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  streak_days INTEGER DEFAULT 0,
  last_message_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for circles (everyone can view)
CREATE POLICY "Anyone can view circles" ON public.circles FOR SELECT USING (true);

-- RLS Policies for user_circles
CREATE POLICY "Users can view their own circles" ON public.user_circles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own circles" ON public.user_circles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own circles" ON public.user_circles FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for circle_members
CREATE POLICY "Users can view members of their circles" ON public.circle_members FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM user_circles 
    WHERE user_circles.circle_id = circle_members.circle_id 
    AND user_circles.user_id = auth.uid()
  ));

CREATE POLICY "Users can add members to their circles" ON public.circle_members FOR INSERT 
  WITH CHECK (
    auth.uid() = added_by 
    AND EXISTS (
      SELECT 1 FROM user_circles 
      WHERE user_circles.circle_id = circle_members.circle_id 
      AND user_circles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove members from their circles" ON public.circle_members FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM user_circles 
    WHERE user_circles.circle_id = circle_members.circle_id 
    AND user_circles.user_id = auth.uid()
  ));

-- RLS Policies for message_streaks
CREATE POLICY "Users can view their own streaks" ON public.message_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own streaks" ON public.message_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can modify their own streaks" ON public.message_streaks FOR UPDATE USING (auth.uid() = user_id);

-- Function to get message streak
CREATE OR REPLACE FUNCTION get_message_streak(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER;
BEGIN
  SELECT streak_days INTO streak
  FROM message_streaks
  WHERE user_id = user_id_param;
  
  RETURN COALESCE(streak, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Insert default circles
INSERT INTO circles (name, emoji, color) VALUES
  ('S2G-Sowers', '🔴', 'bg-red-500'),
  ('S2G-Whisperers', '🟡', 'bg-yellow-500'),
  ('364yhvh-Family', '🟢', 'bg-green-500'),
  ('Family', '🔵', 'bg-blue-500'),
  ('Friends', '🟣', 'bg-purple-500')
ON CONFLICT DO NOTHING;