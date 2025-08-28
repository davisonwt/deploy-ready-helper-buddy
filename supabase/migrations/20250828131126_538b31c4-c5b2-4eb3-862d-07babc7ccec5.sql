-- Create video_gifts table for free-will gifts to video creators
CREATE TABLE public.video_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.community_videos(id) ON DELETE CASCADE,
  giver_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  creator_amount NUMERIC NOT NULL CHECK (creator_amount >= 0),
  platform_fee NUMERIC NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  sow2grow_fee NUMERIC NOT NULL DEFAULT 0 CHECK (sow2grow_fee >= 0),
  message TEXT,
  transaction_hash TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.video_gifts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_gifts
CREATE POLICY "Users can view gifts they sent or received" 
ON public.video_gifts 
FOR SELECT 
USING (auth.uid() = giver_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send gifts" 
ON public.video_gifts 
FOR INSERT 
WITH CHECK (auth.uid() = giver_id);

CREATE POLICY "System can update gift status" 
ON public.video_gifts 
FOR UPDATE 
USING (true);

-- Add indexes for better performance
CREATE INDEX idx_video_gifts_video_id ON public.video_gifts(video_id);
CREATE INDEX idx_video_gifts_giver_id ON public.video_gifts(giver_id);
CREATE INDEX idx_video_gifts_receiver_id ON public.video_gifts(receiver_id);
CREATE INDEX idx_video_gifts_created_at ON public.video_gifts(created_at DESC);