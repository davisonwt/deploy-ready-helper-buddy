-- Create user_progress table for tracking XP, level, fruits, streak, and activity
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  fruits INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_active DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user_progress
CREATE POLICY "Users can view their own progress"
ON public.user_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.user_progress
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert progress"
ON public.user_progress
FOR INSERT
WITH CHECK (true);

-- Create function to initialize user progress on signup
CREATE OR REPLACE FUNCTION public.initialize_user_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, xp, level, fruits, streak, last_active)
  VALUES (NEW.id, 50, 1, 0, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-initialize progress on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_create_progress ON auth.users;
CREATE TRIGGER on_auth_user_created_create_progress
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_progress();

-- Create function to update last_active timestamp
CREATE OR REPLACE FUNCTION public.update_user_progress_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_progress
  SET last_active = CURRENT_DATE,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_progress_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_progress_updated_at();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_progress_level ON public.user_progress(level);
CREATE INDEX IF NOT EXISTS idx_user_progress_xp ON public.user_progress(xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_streak ON public.user_progress(streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_last_active ON public.user_progress(last_active);

