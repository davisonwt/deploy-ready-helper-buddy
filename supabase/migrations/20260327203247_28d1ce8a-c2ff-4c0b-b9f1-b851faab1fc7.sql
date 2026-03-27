-- Table for sowers to override AI-generated seed stories
CREATE TABLE IF NOT EXISTS public.seed_story_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_id text NOT NULL,
  user_id uuid NOT NULL,
  story_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seed_id, user_id)
);

ALTER TABLE public.seed_story_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all story overrides"
  ON public.seed_story_overrides FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own story overrides"
  ON public.seed_story_overrides FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own story overrides"
  ON public.seed_story_overrides FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add content_category to memry_posts for homemade/seed/testimony/tutorial classification
ALTER TABLE public.memry_posts ADD COLUMN IF NOT EXISTS content_category text DEFAULT 'seed';