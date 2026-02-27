
-- Create biz_ads table for user-uploaded business advertisements
CREATE TABLE public.biz_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image', -- image, video, audio
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.biz_ads ENABLE ROW LEVEL SECURITY;

-- Users can view all approved/active ads
CREATE POLICY "Anyone can view approved ads" ON public.biz_ads
  FOR SELECT TO authenticated
  USING (status = 'approved' AND is_active = true);

-- Users can view their own ads regardless of status
CREATE POLICY "Users can view own ads" ON public.biz_ads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own ads
CREATE POLICY "Users can create ads" ON public.biz_ads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own ads
CREATE POLICY "Users can update own ads" ON public.biz_ads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own ads
CREATE POLICY "Users can delete own ads" ON public.biz_ads
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage all ads
CREATE POLICY "Admins can manage all ads" ON public.biz_ads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for ad media
INSERT INTO storage.buckets (id, name, public) VALUES ('biz-ads', 'biz-ads', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload ads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'biz-ads');

CREATE POLICY "Anyone can view ad media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'biz-ads');

CREATE POLICY "Users can delete own ad media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'biz-ads' AND (storage.foldername(name))[1] = auth.uid()::text);
