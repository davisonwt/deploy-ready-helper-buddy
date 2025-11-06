-- Create storage buckets for media dock
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('live-session-docs', 'live-session-docs', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('live-session-art', 'live-session-art', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('live-session-music', 'live-session-music', false, 104857600, ARRAY['audio/mpeg', 'audio/mp4', 'audio/flac', 'audio/wav', 'audio/x-m4a']);

-- Create table for tracking media uploads in live sessions
CREATE TABLE IF NOT EXISTS public.live_session_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('doc', 'art', 'music', 'voice', 'video')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds INTEGER, -- for audio/video
  price_cents INTEGER DEFAULT 0, -- 0 = free, >0 = paid
  watermarked BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create table for media purchases
CREATE TABLE IF NOT EXISTS public.live_session_media_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES public.live_session_media(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_paid_cents INTEGER NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'crypto')),
  payment_reference TEXT,
  delivered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_id, buyer_id)
);

-- Enable RLS
ALTER TABLE public.live_session_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_media_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_session_media
CREATE POLICY "Anyone can view media in sessions"
  ON public.live_session_media FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upload media"
  ON public.live_session_media FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can update their own media"
  ON public.live_session_media FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can delete their own media"
  ON public.live_session_media FOR DELETE
  TO authenticated
  USING (auth.uid() = uploader_id);

-- RLS Policies for live_session_media_purchases
CREATE POLICY "Users can view their own purchases"
  ON public.live_session_media_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Authenticated users can make purchases"
  ON public.live_session_media_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Storage policies for docs bucket
CREATE POLICY "Authenticated users can upload docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'live-session-docs');

CREATE POLICY "Authenticated users can read their docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'live-session-docs');

CREATE POLICY "Users can update their own docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'live-session-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'live-session-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for art bucket (public read)
CREATE POLICY "Anyone can view art"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'live-session-art');

CREATE POLICY "Authenticated users can upload art"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'live-session-art');

CREATE POLICY "Users can update their own art"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'live-session-art' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own art"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'live-session-art' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for music bucket
CREATE POLICY "Authenticated users can upload music"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'live-session-music');

CREATE POLICY "Authenticated users can read music"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'live-session-music');

CREATE POLICY "Users can update their own music"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'live-session-music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own music"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'live-session-music' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes for performance
CREATE INDEX idx_live_session_media_session ON public.live_session_media(session_id);
CREATE INDEX idx_live_session_media_uploader ON public.live_session_media(uploader_id);
CREATE INDEX idx_live_session_media_type ON public.live_session_media(media_type);
CREATE INDEX idx_live_session_media_purchases_buyer ON public.live_session_media_purchases(buyer_id);
CREATE INDEX idx_live_session_media_purchases_media ON public.live_session_media_purchases(media_id);

-- Trigger for updated_at
CREATE TRIGGER update_live_session_media_updated_at
  BEFORE UPDATE ON public.live_session_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();