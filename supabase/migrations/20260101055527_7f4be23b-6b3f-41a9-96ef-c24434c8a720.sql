-- Create memry_posts table for storing user posts
CREATE TABLE public.memry_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('photo', 'video', 'recipe', 'music')),
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  recipe_title TEXT,
  recipe_ingredients TEXT[],
  recipe_instructions TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memry_comments table
CREATE TABLE public.memry_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.memry_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memry_likes table for tracking who liked what
CREATE TABLE public.memry_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.memry_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create memry_bookmarks table
CREATE TABLE public.memry_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.memry_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.memry_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memry_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memry_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memry_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memry_posts
CREATE POLICY "Anyone can view memry posts"
ON public.memry_posts FOR SELECT
USING (true);

CREATE POLICY "Users can create their own posts"
ON public.memry_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON public.memry_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON public.memry_posts FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for memry_comments
CREATE POLICY "Anyone can view comments"
ON public.memry_comments FOR SELECT
USING (true);

CREATE POLICY "Users can create comments"
ON public.memry_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.memry_comments FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for memry_likes
CREATE POLICY "Anyone can view likes"
ON public.memry_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like posts"
ON public.memry_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
ON public.memry_likes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for memry_bookmarks
CREATE POLICY "Users can view their bookmarks"
ON public.memry_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark posts"
ON public.memry_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove bookmarks"
ON public.memry_bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for memry media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memry-media',
  'memry-media',
  true,
  104857600, -- 100MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
);

-- Storage policies for memry-media bucket
CREATE POLICY "Anyone can view memry media"
ON storage.objects FOR SELECT
USING (bucket_id = 'memry-media');

CREATE POLICY "Authenticated users can upload memry media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'memry-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own memry media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'memry-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own memry media"
ON storage.objects FOR DELETE
USING (bucket_id = 'memry-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for performance
CREATE INDEX idx_memry_posts_user_id ON public.memry_posts(user_id);
CREATE INDEX idx_memry_posts_created_at ON public.memry_posts(created_at DESC);
CREATE INDEX idx_memry_comments_post_id ON public.memry_comments(post_id);
CREATE INDEX idx_memry_likes_post_id ON public.memry_likes(post_id);
CREATE INDEX idx_memry_likes_user_id ON public.memry_likes(user_id);

-- Function to update likes count
CREATE OR REPLACE FUNCTION public.update_memry_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memry_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memry_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for likes count
CREATE TRIGGER update_memry_likes_count_trigger
AFTER INSERT OR DELETE ON public.memry_likes
FOR EACH ROW EXECUTE FUNCTION public.update_memry_likes_count();

-- Function to update comments count
CREATE OR REPLACE FUNCTION public.update_memry_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE memry_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE memry_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for comments count
CREATE TRIGGER update_memry_comments_count_trigger
AFTER INSERT OR DELETE ON public.memry_comments
FOR EACH ROW EXECUTE FUNCTION public.update_memry_comments_count();