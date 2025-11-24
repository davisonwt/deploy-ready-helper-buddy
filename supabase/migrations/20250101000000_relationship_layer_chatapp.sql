-- Relationship Layer ChatApp - Database Schema
-- Creates tables for circles, members, and streaks

-- Circles table
CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  unread_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User circles (which circles a user has)
CREATE TABLE IF NOT EXISTS user_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, circle_id)
);

-- Circle members (people in each circle)
CREATE TABLE IF NOT EXISTS circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

-- Message streaks (for streak badges)
CREATE TABLE IF NOT EXISTS message_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_days INTEGER DEFAULT 0,
  last_message_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak
CREATE OR REPLACE FUNCTION update_message_streak(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER;
  last_date DATE;
  today_date DATE := CURRENT_DATE;
BEGIN
  -- Get current streak
  SELECT streak_days, last_message_date INTO current_streak, last_date
  FROM message_streaks
  WHERE user_id = user_id_param;

  -- If no record exists, create one
  IF current_streak IS NULL THEN
    INSERT INTO message_streaks (user_id, streak_days, last_message_date)
    VALUES (user_id_param, 1, today_date)
    ON CONFLICT (user_id) DO UPDATE
    SET streak_days = 1, last_message_date = today_date, updated_at = NOW();
    RETURN 1;
  END IF;

  -- If last message was yesterday, increment streak
  IF last_date = today_date - INTERVAL '1 day' THEN
    UPDATE message_streaks
    SET streak_days = current_streak + 1,
        last_message_date = today_date,
        updated_at = NOW()
    WHERE user_id = user_id_param;
    RETURN current_streak + 1;
  -- If last message was today, keep streak
  ELSIF last_date = today_date THEN
    RETURN current_streak;
  -- Otherwise, reset streak
  ELSE
    UPDATE message_streaks
    SET streak_days = 1,
        last_message_date = today_date,
        updated_at = NOW()
    WHERE user_id = user_id_param;
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initialize default circles
INSERT INTO circles (name, emoji, color) VALUES
  ('S2G-Sowers', '🔴', 'bg-red-500'),
  ('S2G-Whisperers', '🟡', 'bg-yellow-500'),
  ('364yhvh-Family', '🟢', 'bg-green-500'),
  ('Family', '🔵', 'bg-blue-500'),
  ('Friends', '🟣', 'bg-purple-500')
ON CONFLICT DO NOTHING;

-- Row Level Security
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_streaks ENABLE ROW LEVEL SECURITY;

-- Policies for circles (public read, authenticated write)
CREATE POLICY "Circles are viewable by everyone" ON circles
  FOR SELECT USING (true);

CREATE POLICY "Users can create circles" ON circles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for user_circles
CREATE POLICY "Users can view their own circles" ON user_circles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add circles" ON user_circles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their circles" ON user_circles
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for circle_members
CREATE POLICY "Users can view members of their circles" ON circle_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_circles
      WHERE user_circles.user_id = auth.uid()
      AND user_circles.circle_id = circle_members.circle_id
    )
  );

CREATE POLICY "Users can add members to their circles" ON circle_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_circles
      WHERE user_circles.user_id = auth.uid()
      AND user_circles.circle_id = circle_members.circle_id
    )
  );

-- Policies for message_streaks
CREATE POLICY "Users can view their own streak" ON message_streaks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak" ON message_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to update circle member count
CREATE OR REPLACE FUNCTION update_circle_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circles
    SET member_count = (
      SELECT COUNT(*) FROM circle_members
      WHERE circle_id = NEW.circle_id
    )
    WHERE id = NEW.circle_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circles
    SET member_count = (
      SELECT COUNT(*) FROM circle_members
      WHERE circle_id = OLD.circle_id
    )
    WHERE id = OLD.circle_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER circle_member_count_trigger
  AFTER INSERT OR DELETE ON circle_members
  FOR EACH ROW
  EXECUTE FUNCTION update_circle_member_count();

