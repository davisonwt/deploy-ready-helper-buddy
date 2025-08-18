-- Create community videos table
CREATE TABLE public.community_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id UUID NOT NULL,
  uploader_profile_id UUID,
  title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  tags TEXT[] DEFAULT '{}',
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 30 AND duration_seconds <= 60),
  file_size INTEGER NOT NULL CHECK (file_size <= 104857600), -- 100MB limit
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID
);

-- Create video likes table
CREATE TABLE public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.community_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Create video comments table
CREATE TABLE public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.community_videos(id) ON DELETE CASCADE,
  commenter_id UUID NOT NULL,
  commenter_profile_id UUID,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for community_videos
CREATE POLICY "Users can view approved videos" 
ON public.community_videos 
FOR SELECT 
USING (status = 'approved');

CREATE POLICY "Users can view their own videos" 
ON public.community_videos 
FOR SELECT 
USING (auth.uid() = uploader_id);

CREATE POLICY "Admins can view all videos" 
ON public.community_videos 
FOR SELECT 
USING (is_admin_or_gosat(auth.uid()));

CREATE POLICY "Users can upload videos" 
ON public.community_videos 
FOR INSERT 
WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Users can update their own videos" 
ON public.community_videos 
FOR UPDATE 
USING (auth.uid() = uploader_id);

CREATE POLICY "Admins can update any video" 
ON public.community_videos 
FOR UPDATE 
USING (is_admin_or_gosat(auth.uid()));

-- RLS Policies for video_likes
CREATE POLICY "Users can view video likes" 
ON public.video_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can like videos" 
ON public.video_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike videos" 
ON public.video_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for video_comments
CREATE POLICY "Users can view video comments" 
ON public.video_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can comment on videos" 
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

-- Triggers for timestamps
CREATE TRIGGER update_community_videos_updated_at
BEFORE UPDATE ON public.community_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_comments_updated_at
BEFORE UPDATE ON public.video_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update video stats
CREATE OR REPLACE FUNCTION public.update_video_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'video_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_videos
      SET like_count = like_count + 1
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.community_videos
      SET like_count = GREATEST(like_count - 1, 0)
      WHERE id = OLD.video_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'video_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.community_videos
      SET comment_count = comment_count + 1
      WHERE id = NEW.video_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.community_videos
      SET comment_count = GREATEST(comment_count - 1, 0)
      WHERE id = OLD.video_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers for updating stats
CREATE TRIGGER update_like_stats
AFTER INSERT OR DELETE ON public.video_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_video_stats();

CREATE TRIGGER update_comment_stats
AFTER INSERT OR DELETE ON public.video_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_video_stats();

-- Function to increment video views
CREATE OR REPLACE FUNCTION public.increment_video_views(video_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_videos
  SET view_count = view_count + 1
  WHERE id = video_uuid;
END;
$$;

-- Storage policies for videos bucket
CREATE POLICY "Users can upload videos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view approved videos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Users can update their own videos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);