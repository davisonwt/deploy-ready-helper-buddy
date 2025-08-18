-- Create AI assistant content types enum
CREATE TYPE ai_content_type AS ENUM ('script', 'voice_over', 'marketing_tip', 'thumbnail', 'content_idea');

-- Create AI creations table to store generated content
CREATE TABLE public.ai_creations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type ai_content_type NOT NULL,
  title TEXT NOT NULL,
  content_text TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  product_description TEXT,
  target_audience TEXT,
  video_length INTEGER, -- in seconds
  style TEXT,
  custom_prompt TEXT,
  is_favorited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage tracking table for rate limiting
CREATE TABLE public.ai_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT current_date,
  generations_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.ai_creations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- AI creations policies
CREATE POLICY "Users can view their own AI creations"
  ON public.ai_creations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own AI creations"
  ON public.ai_creations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI creations"
  ON public.ai_creations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI creations"
  ON public.ai_creations FOR DELETE
  USING (auth.uid() = user_id);

-- AI usage policies
CREATE POLICY "Users can view their own usage"
  ON public.ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
  ON public.ai_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_ai_usage(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  INSERT INTO ai_usage (user_id, date, generations_count)
  VALUES (user_id_param, current_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET generations_count = ai_usage.generations_count + 1;
  
  SELECT generations_count INTO current_count
  FROM ai_usage
  WHERE user_id = user_id_param AND date = current_date;
  
  RETURN current_count;
END;
$$;

-- Function to get current usage
CREATE OR REPLACE FUNCTION get_ai_usage_today(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER := 0;
BEGIN
  SELECT COALESCE(generations_count, 0) INTO current_count
  FROM ai_usage
  WHERE user_id = user_id_param AND date = current_date;
  
  RETURN current_count;
END;
$$;

-- Create updated_at trigger
CREATE TRIGGER update_ai_creations_updated_at
  BEFORE UPDATE ON public.ai_creations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();