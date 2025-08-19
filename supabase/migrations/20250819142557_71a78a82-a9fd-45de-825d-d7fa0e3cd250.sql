-- Create community_videos table
CREATE TABLE public.community_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size BIGINT,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_likes table
CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.community_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Create video_comments table
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.community_videos(id) ON DELETE CASCADE,
  commenter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  commenter_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.community_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_videos
CREATE POLICY "Anyone can view approved videos" 
ON public.community_videos 
FOR SELECT 
USING (status = 'approved');

CREATE POLICY "Users can view their own videos" 
ON public.community_videos 
FOR SELECT 
USING (auth.uid() = uploader_id);

CREATE POLICY "Users can insert their own videos" 
ON public.community_videos 
FOR INSERT 
WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can update their own videos" 
ON public.community_videos 
FOR UPDATE 
USING (auth.uid() = uploader_id);

CREATE POLICY "Users can delete their own videos" 
ON public.community_videos 
FOR DELETE 
USING (auth.uid() = uploader_id);

-- RLS Policies for video_likes
CREATE POLICY "Users can view all likes" 
ON public.video_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own likes" 
ON public.video_likes 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for video_comments
CREATE POLICY "Users can view all comments" 
ON public.video_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert comments" 
ON public.video_comments 
FOR INSERT 
WITH CHECK (auth.uid() = commenter_id);

CREATE POLICY "Users can update their own comments" 
ON public.video_comments 
FOR UPDATE 
USING (auth.uid() = commenter_id);

CREATE POLICY "Users can delete their own comments" 
ON public.video_comments 
FOR DELETE 
USING (auth.uid() = commenter_id);

-- Create indexes for performance
CREATE INDEX idx_community_videos_status ON public.community_videos(status);
CREATE INDEX idx_community_videos_uploader ON public.community_videos(uploader_id);
CREATE INDEX idx_community_videos_created_at ON public.community_videos(created_at DESC);
CREATE INDEX idx_community_videos_view_count ON public.community_videos(view_count DESC);
CREATE INDEX idx_video_likes_video ON public.video_likes(video_id);
CREATE INDEX idx_video_comments_video ON public.video_comments(video_id);

-- Create function to increment video views
CREATE OR REPLACE FUNCTION public.increment_video_views(video_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.community_videos
  SET view_count = view_count + 1
  WHERE id = video_uuid;
END;
$$;

-- Create triggers to update counts
CREATE OR REPLACE FUNCTION public.update_video_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'video_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_videos 
      SET like_count = (
        SELECT COUNT(*) FROM public.video_likes 
        WHERE video_id = NEW.video_id
      )
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.community_videos 
      SET like_count = (
        SELECT COUNT(*) FROM public.video_likes 
        WHERE video_id = OLD.video_id
      )
      WHERE id = OLD.video_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'video_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_videos 
      SET comment_count = (
        SELECT COUNT(*) FROM public.video_comments 
        WHERE video_id = NEW.video_id
      )
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.community_videos 
      SET comment_count = (
        SELECT COUNT(*) FROM public.video_comments 
        WHERE video_id = OLD.video_id
      )
      WHERE id = OLD.video_id;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers
CREATE TRIGGER update_video_like_count
  AFTER INSERT OR DELETE ON public.video_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_video_counts();

CREATE TRIGGER update_video_comment_count
  AFTER INSERT OR DELETE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_video_counts();

-- Create trigger for updated_at timestamps
CREATE TRIGGER update_community_videos_updated_at
  BEFORE UPDATE ON public.community_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_comments_updated_at
  BEFORE UPDATE ON public.video_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();