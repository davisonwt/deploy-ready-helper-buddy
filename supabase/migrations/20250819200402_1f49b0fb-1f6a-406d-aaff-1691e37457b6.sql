-- Create table for video metadata and AI-generated content
CREATE TABLE IF NOT EXISTS public.video_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  video_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  tags TEXT[],
  platform_optimizations JSONB,
  ai_generated_script TEXT,
  ai_generated_description TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on video_content table
ALTER TABLE public.video_content ENABLE ROW LEVEL SECURITY;

-- Create policies for video_content
CREATE POLICY "Users can view their own video content" 
ON public.video_content 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video content" 
ON public.video_content 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video content" 
ON public.video_content 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video content" 
ON public.video_content 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates (if function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_video_content_updated_at
        BEFORE UPDATE ON public.video_content
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;