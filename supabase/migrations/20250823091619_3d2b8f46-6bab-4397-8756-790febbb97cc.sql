-- Create live call participants table to track who's in calls and their status
CREATE TABLE public.live_call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'participant', -- 'host', 'moderator', 'participant'
  is_muted BOOLEAN NOT NULL DEFAULT true,
  hand_raised_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  queue_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_call_participants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view call participants" 
ON public.live_call_participants 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own participation" 
ON public.live_call_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.live_call_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Hosts and moderators can update all participants" 
ON public.live_call_participants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.live_call_participants lcp 
    WHERE lcp.call_session_id = live_call_participants.call_session_id 
    AND lcp.user_id = auth.uid() 
    AND lcp.role IN ('host', 'moderator')
    AND lcp.is_active = true
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_live_call_participants_updated_at
BEFORE UPDATE ON public.live_call_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to manage queue positions
CREATE OR REPLACE FUNCTION public.reorder_hand_raise_queue(call_session_id_param TEXT)
RETURNS void AS $$
BEGIN
  WITH ranked_participants AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY hand_raised_at ASC) as new_position
    FROM public.live_call_participants
    WHERE call_session_id = call_session_id_param
    AND hand_raised_at IS NOT NULL
    AND is_active = true
  )
  UPDATE public.live_call_participants
  SET queue_position = ranked_participants.new_position
  FROM ranked_participants
  WHERE public.live_call_participants.id = ranked_participants.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;