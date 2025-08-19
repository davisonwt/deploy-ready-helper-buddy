-- Create gamification tables for user achievements and points
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for user achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (true);

-- Create user points table
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  points_to_next_level INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Create policies for user points
CREATE POLICY "Users can view their own points" 
ON public.user_points 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own points" 
ON public.user_points 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update points" 
ON public.user_points 
FOR UPDATE 
USING (true);

-- Create function to award achievement
CREATE OR REPLACE FUNCTION public.award_achievement(
  user_id_param UUID,
  achievement_type_param TEXT,
  title_param TEXT,
  description_param TEXT,
  points_param INTEGER DEFAULT 0,
  icon_param TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Check if user already has this achievement
  IF NOT EXISTS (
    SELECT 1 FROM user_achievements 
    WHERE user_id = user_id_param AND achievement_type = achievement_type_param
  ) THEN
    -- Insert new achievement
    INSERT INTO user_achievements (user_id, achievement_type, title, description, points_awarded, icon)
    VALUES (user_id_param, achievement_type_param, title_param, description_param, points_param, icon_param);
    
    -- Update user points
    INSERT INTO user_points (user_id, total_points)
    VALUES (user_id_param, points_param)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_points = user_points.total_points + points_param,
      level = CASE 
        WHEN (user_points.total_points + points_param) >= 1000 THEN 5
        WHEN (user_points.total_points + points_param) >= 500 THEN 4
        WHEN (user_points.total_points + points_param) >= 250 THEN 3
        WHEN (user_points.total_points + points_param) >= 100 THEN 2
        ELSE 1
      END,
      points_to_next_level = CASE
        WHEN (user_points.total_points + points_param) >= 1000 THEN 0
        WHEN (user_points.total_points + points_param) >= 500 THEN 1000 - (user_points.total_points + points_param)
        WHEN (user_points.total_points + points_param) >= 250 THEN 500 - (user_points.total_points + points_param)
        WHEN (user_points.total_points + points_param) >= 100 THEN 250 - (user_points.total_points + points_param)
        ELSE 100 - (user_points.total_points + points_param)
      END,
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification system
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.user_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.user_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create trigger to award achievements on certain actions
CREATE OR REPLACE FUNCTION public.check_achievements() 
RETURNS TRIGGER AS $$
BEGIN
  -- First orchard creation
  IF TG_TABLE_NAME = 'orchards' AND TG_OP = 'INSERT' THEN
    -- Check if this is user's first orchard
    IF (SELECT COUNT(*) FROM orchards WHERE user_id = NEW.user_id) = 1 THEN
      PERFORM award_achievement(
        NEW.user_id, 
        'first_orchard', 
        'Green Thumb', 
        'Created your first orchard!', 
        50,
        'sprout'
      );
    END IF;
  END IF;

  -- First bestowal
  IF TG_TABLE_NAME = 'bestowals' AND TG_OP = 'INSERT' THEN
    -- Check if this is user's first bestowal
    IF (SELECT COUNT(*) FROM bestowals WHERE bestower_id = NEW.bestower_id) = 1 THEN
      PERFORM award_achievement(
        NEW.bestower_id, 
        'first_bestowal', 
        'Generous Soul', 
        'Made your first contribution!', 
        25,
        'heart'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for achievements
CREATE TRIGGER orchard_achievement_trigger
  AFTER INSERT ON public.orchards
  FOR EACH ROW
  EXECUTE FUNCTION public.check_achievements();

CREATE TRIGGER bestowal_achievement_trigger
  AFTER INSERT ON public.bestowals
  FOR EACH ROW
  EXECUTE FUNCTION public.check_achievements();

-- Create update trigger for updated_at
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();