-- Create live streaming sessions table
CREATE TABLE public.radio_live_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.radio_schedule(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'ended')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radio_live_sessions ENABLE ROW LEVEL SECURITY;

-- Create live hosts table (max 3 hosts per session)
CREATE TABLE public.radio_live_hosts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE,
  dj_id UUID NOT NULL REFERENCES public.radio_djs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'host' CHECK (role IN ('main_host', 'co_host', 'guest')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  audio_enabled BOOLEAN NOT NULL DEFAULT true,
  video_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radio_live_hosts ENABLE ROW LEVEL SECURITY;

-- Create guest requests table
CREATE TABLE public.radio_guest_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radio_guest_requests ENABLE ROW LEVEL SECURITY;

-- Add constraints to ensure max 3 active hosts per session
CREATE OR REPLACE FUNCTION public.check_max_hosts()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if adding this host would exceed the limit
  IF (SELECT COUNT(*) FROM public.radio_live_hosts 
      WHERE session_id = NEW.session_id 
      AND is_active = true 
      AND role IN ('main_host', 'co_host')) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 hosts per session exceeded';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_max_hosts_trigger
  BEFORE INSERT OR UPDATE ON public.radio_live_hosts
  FOR EACH ROW EXECUTE FUNCTION public.check_max_hosts();

-- RLS Policies for radio_live_sessions
CREATE POLICY "Anyone can view live sessions" 
ON public.radio_live_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Radio admins and DJs can manage sessions" 
ON public.radio_live_sessions 
FOR ALL 
USING (
  has_role(auth.uid(), 'radio_admin') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gosat') OR
  EXISTS (
    SELECT 1 FROM public.radio_schedule rs
    JOIN public.radio_djs rd ON rs.dj_id = rd.id
    WHERE rs.id = radio_live_sessions.schedule_id 
    AND rd.user_id = auth.uid()
  )
);

-- RLS Policies for radio_live_hosts
CREATE POLICY "Anyone can view live hosts" 
ON public.radio_live_hosts 
FOR SELECT 
USING (true);

CREATE POLICY "Hosts and admins can manage host records" 
ON public.radio_live_hosts 
FOR ALL 
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'radio_admin') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gosat')
);

-- RLS Policies for radio_guest_requests
CREATE POLICY "Users can view and create their own guest requests" 
ON public.radio_guest_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create guest requests" 
ON public.radio_guest_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guest requests" 
ON public.radio_guest_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Hosts and admins can manage guest requests" 
ON public.radio_guest_requests 
FOR ALL 
USING (
  has_role(auth.uid(), 'radio_admin') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'gosat') OR
  EXISTS (
    SELECT 1 FROM public.radio_live_sessions rls
    JOIN public.radio_live_hosts rlh ON rls.id = rlh.session_id
    WHERE rls.id = radio_guest_requests.session_id 
    AND rlh.user_id = auth.uid()
    AND rlh.is_active = true
    AND rlh.role IN ('main_host', 'co_host')
  )
);

-- Function to check if user can join session early (10 minutes before)
CREATE OR REPLACE FUNCTION public.can_join_session_early(schedule_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_time TIMESTAMP WITH TIME ZONE;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Get the start time of the scheduled show
  SELECT rs.start_time INTO start_time
  FROM public.radio_schedule rs
  WHERE rs.id = schedule_id_param;
  
  -- Allow login 10 minutes before start time
  RETURN (current_time >= (start_time - INTERVAL '10 minutes') AND current_time <= start_time + INTERVAL '1 hour');
END;
$$;

-- Function to get or create live session
CREATE OR REPLACE FUNCTION public.get_or_create_live_session(schedule_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_id UUID;
  session_token TEXT;
BEGIN
  -- Check if session already exists
  SELECT id INTO session_id
  FROM public.radio_live_sessions
  WHERE schedule_id = schedule_id_param
  AND status IN ('waiting', 'live');
  
  -- If no session exists, create one
  IF session_id IS NULL THEN
    session_token := encode(gen_random_bytes(32), 'hex');
    
    INSERT INTO public.radio_live_sessions (schedule_id, session_token)
    VALUES (schedule_id_param, session_token)
    RETURNING id INTO session_id;
  END IF;
  
  RETURN session_id;
END;
$$;

-- Add updated_at trigger for live sessions
CREATE TRIGGER update_radio_live_sessions_updated_at
  BEFORE UPDATE ON public.radio_live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_radio_live_sessions_schedule_id ON public.radio_live_sessions(schedule_id);
CREATE INDEX idx_radio_live_sessions_status ON public.radio_live_sessions(status);
CREATE INDEX idx_radio_live_hosts_session_id ON public.radio_live_hosts(session_id);
CREATE INDEX idx_radio_live_hosts_user_id ON public.radio_live_hosts(user_id);
CREATE INDEX idx_radio_guest_requests_session_id ON public.radio_guest_requests(session_id);
CREATE INDEX idx_radio_guest_requests_user_id ON public.radio_guest_requests(user_id);
CREATE INDEX idx_radio_guest_requests_status ON public.radio_guest_requests(status);