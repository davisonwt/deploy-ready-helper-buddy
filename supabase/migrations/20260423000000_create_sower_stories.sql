-- Add website column to profiles if not already present
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;

-- Create sower_stories table
CREATE TABLE public.sower_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story TEXT NOT NULL,
  tagline TEXT NOT NULL,
  instagram_caption TEXT NOT NULL,
  facebook_caption TEXT NOT NULL,
  twitter_caption TEXT NOT NULL,
  hashtags TEXT[] NOT NULL,
  brochure_intro TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- One story record per user (upsert pattern — latest replaces previous)
CREATE UNIQUE INDEX idx_sower_stories_user_id ON public.sower_stories(user_id);

CREATE INDEX idx_sower_stories_generated_at ON public.sower_stories(generated_at DESC);

ALTER TABLE public.sower_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own story"
  ON public.sower_stories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own story"
  ON public.sower_stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own story"
  ON public.sower_stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all stories"
  ON public.sower_stories FOR ALL
  USING (true)
  WITH CHECK (true);
