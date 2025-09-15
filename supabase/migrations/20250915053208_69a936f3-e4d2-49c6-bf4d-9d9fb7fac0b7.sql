-- Create live streaming tables and storage

-- Live streams table
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  quality TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'live',
  viewer_count INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  recording_url TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE,
  thumbnail_url TEXT,
  stream_key TEXT,
  rtmp_url TEXT,
  hls_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stream analytics table
CREATE TABLE IF NOT EXISTS public.stream_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'join', 'leave', 'view_duration', 'quality_change', 'chat_message'
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stream chat messages table
CREATE TABLE IF NOT EXISTS public.stream_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'reaction', 'gift'
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stream viewers table (for real-time tracking)
CREATE TABLE IF NOT EXISTS public.stream_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  quality_preference TEXT DEFAULT 'auto',
  UNIQUE(stream_id, user_id)
);

-- Stream recordings table
CREATE TABLE IF NOT EXISTS public.stream_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  quality TEXT NOT NULL,
  format TEXT NOT NULL DEFAULT 'webm',
  status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'ready', 'failed'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies for live_streams
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view live streams" ON public.live_streams
  FOR SELECT USING (status = 'live' OR status = 'ended');

CREATE POLICY "Users can create their own streams" ON public.live_streams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streams" ON public.live_streams
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streams" ON public.live_streams
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for stream_analytics
ALTER TABLE public.stream_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stream owners can view analytics" ON public.stream_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.live_streams 
      WHERE id = stream_analytics.stream_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert analytics" ON public.stream_analytics
  FOR INSERT WITH CHECK (true);

-- Add RLS policies for stream_chat_messages
ALTER TABLE public.stream_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat messages for active streams" ON public.stream_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.live_streams 
      WHERE id = stream_chat_messages.stream_id 
      AND status = 'live'
    )
  );

CREATE POLICY "Authenticated users can send chat messages" ON public.stream_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages" ON public.stream_chat_messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" ON public.stream_chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Add RLS policies for stream_viewers
ALTER TABLE public.stream_viewers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stream owners can view all viewers" ON public.stream_viewers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.live_streams 
      WHERE id = stream_viewers.stream_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own viewer records" ON public.stream_viewers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own viewer records" ON public.stream_viewers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own viewer records" ON public.stream_viewers
  FOR UPDATE USING (auth.uid() = user_id);

-- Add RLS policies for stream_recordings
ALTER TABLE public.stream_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stream owners can view recordings" ON public.stream_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.live_streams 
      WHERE id = stream_recordings.stream_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage recordings" ON public.stream_recordings
  FOR ALL USING (true);

-- Create storage buckets for streaming
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('stream-recordings', 'stream-recordings', false, 1073741824, ARRAY['video/webm', 'video/mp4']),
  ('stream-thumbnails', 'stream-thumbnails', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for stream-recordings
CREATE POLICY "Stream owners can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stream-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Stream owners can view their recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'stream-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Stream owners can delete their recordings" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'stream-recordings' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policies for stream-thumbnails
CREATE POLICY "Stream thumbnails are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'stream-thumbnails');

CREATE POLICY "Users can upload their stream thumbnails" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'stream-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their stream thumbnails" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'stream-thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON public.live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_user_id ON public.live_streams(user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_started_at ON public.live_streams(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_streams_tags ON public.live_streams USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_stream_analytics_stream_id ON public.stream_analytics(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_analytics_timestamp ON public.stream_analytics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_stream_chat_messages_stream_id ON public.stream_chat_messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream_id ON public.stream_viewers(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_viewers_active ON public.stream_viewers(stream_id, is_active);

-- Create functions for stream management
CREATE OR REPLACE FUNCTION public.update_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update viewer count when viewers join/leave
  UPDATE public.live_streams 
  SET viewer_count = (
    SELECT COUNT(*) 
    FROM public.stream_viewers 
    WHERE stream_id = COALESCE(NEW.stream_id, OLD.stream_id) 
    AND is_active = true
  )
  WHERE id = COALESCE(NEW.stream_id, OLD.stream_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic viewer count updates
DROP TRIGGER IF EXISTS trigger_update_viewer_count_insert ON public.stream_viewers;
CREATE TRIGGER trigger_update_viewer_count_insert
  AFTER INSERT ON public.stream_viewers
  FOR EACH ROW EXECUTE FUNCTION public.update_viewer_count();

DROP TRIGGER IF EXISTS trigger_update_viewer_count_update ON public.stream_viewers;
CREATE TRIGGER trigger_update_viewer_count_update
  AFTER UPDATE ON public.stream_viewers
  FOR EACH ROW EXECUTE FUNCTION public.update_viewer_count();

DROP TRIGGER IF EXISTS trigger_update_viewer_count_delete ON public.stream_viewers;
CREATE TRIGGER trigger_update_viewer_count_delete
  AFTER DELETE ON public.stream_viewers
  FOR EACH ROW EXECUTE FUNCTION public.update_viewer_count();

-- Function to get trending streams
CREATE OR REPLACE FUNCTION public.get_trending_streams(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  tags TEXT[],
  viewer_count INTEGER,
  total_views INTEGER,
  started_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  thumbnail_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ls.id,
    ls.title,
    ls.description,
    ls.tags,
    ls.viewer_count,
    ls.total_views,
    ls.started_at,
    ls.user_id,
    ls.thumbnail_url
  FROM public.live_streams ls
  WHERE ls.status = 'live'
  ORDER BY (ls.viewer_count * 2 + ls.total_views) DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;

-- Function to update stream status
CREATE OR REPLACE FUNCTION public.end_stream(stream_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.live_streams
  SET 
    status = 'ended',
    ended_at = now(),
    updated_at = now()
  WHERE id = stream_id_param 
    AND user_id = auth.uid()
    AND status = 'live';
  
  -- Mark all viewers as inactive
  UPDATE public.stream_viewers
  SET is_active = false, last_seen = now()
  WHERE stream_id = stream_id_param;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SET search_path = public SECURITY DEFINER;

-- Enable realtime for live updates
ALTER TABLE public.live_streams REPLICA IDENTITY FULL;
ALTER TABLE public.stream_viewers REPLICA IDENTITY FULL;
ALTER TABLE public.stream_chat_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_chat_messages;