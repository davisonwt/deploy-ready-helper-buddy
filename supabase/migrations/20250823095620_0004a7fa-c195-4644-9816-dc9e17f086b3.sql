-- Create chat join requests table
CREATE TABLE public.chat_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  message TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add moderation fields to chat_participants
ALTER TABLE public.chat_participants 
ADD COLUMN kicked_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN kicked_by UUID NULL,
ADD COLUMN kick_reason TEXT NULL;

-- Enable RLS on chat_join_requests
ALTER TABLE public.chat_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_join_requests
CREATE POLICY "Users can create join requests" 
ON public.chat_join_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own join requests" 
ON public.chat_join_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Room moderators and admins can view join requests" 
ON public.chat_join_requests 
FOR SELECT 
USING (
  -- Room creator can see all requests
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_join_requests.room_id 
    AND cr.created_by = auth.uid()
  ) OR
  -- Room moderators can see requests
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.room_id = chat_join_requests.room_id 
    AND cp.user_id = auth.uid() 
    AND cp.is_moderator = true 
    AND cp.is_active = true
  ) OR
  -- Global admins can see all requests
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

CREATE POLICY "Room moderators and admins can update join requests" 
ON public.chat_join_requests 
FOR UPDATE 
USING (
  -- Room creator can update requests
  EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = chat_join_requests.room_id 
    AND cr.created_by = auth.uid()
  ) OR
  -- Room moderators can update requests
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.room_id = chat_join_requests.room_id 
    AND cp.user_id = auth.uid() 
    AND cp.is_moderator = true 
    AND cp.is_active = true
  ) OR
  -- Global admins can update all requests
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

-- Create indexes for better performance
CREATE INDEX idx_chat_join_requests_room_id ON public.chat_join_requests(room_id);
CREATE INDEX idx_chat_join_requests_user_id ON public.chat_join_requests(user_id);
CREATE INDEX idx_chat_join_requests_status ON public.chat_join_requests(status);

-- Create function to approve join request
CREATE OR REPLACE FUNCTION public.approve_join_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_record record;
BEGIN
  -- Get the join request
  SELECT * INTO request_record
  FROM public.chat_join_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;
  
  -- Check if user has permission to approve
  IF NOT (
    -- Room creator
    EXISTS (
      SELECT 1 FROM public.chat_rooms 
      WHERE id = request_record.room_id AND created_by = auth.uid()
    ) OR
    -- Room moderator
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE room_id = request_record.room_id 
      AND user_id = auth.uid() 
      AND is_moderator = true 
      AND is_active = true
    ) OR
    -- Global admin
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve join request';
  END IF;
  
  -- Update the request status
  UPDATE public.chat_join_requests 
  SET 
    status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = request_id;
  
  -- Add user to chat participants
  INSERT INTO public.chat_participants (room_id, user_id, is_moderator, is_active)
  VALUES (request_record.room_id, request_record.user_id, false, true)
  ON CONFLICT (room_id, user_id) DO UPDATE SET 
    is_active = true,
    kicked_at = NULL,
    kicked_by = NULL,
    kick_reason = NULL;
  
  RETURN TRUE;
END;
$$;

-- Create function to reject join request
CREATE OR REPLACE FUNCTION public.reject_join_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  request_record record;
BEGIN
  -- Get the join request
  SELECT * INTO request_record
  FROM public.chat_join_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Join request not found or already processed';
  END IF;
  
  -- Check if user has permission to reject
  IF NOT (
    -- Room creator
    EXISTS (
      SELECT 1 FROM public.chat_rooms 
      WHERE id = request_record.room_id AND created_by = auth.uid()
    ) OR
    -- Room moderator
    EXISTS (
      SELECT 1 FROM public.chat_participants 
      WHERE room_id = request_record.room_id 
      AND user_id = auth.uid() 
      AND is_moderator = true 
      AND is_active = true
    ) OR
    -- Global admin
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to reject join request';
  END IF;
  
  -- Update the request status
  UPDATE public.chat_join_requests 
  SET 
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = request_id;
  
  RETURN TRUE;
END;
$$;

-- Create function to kick user from room
CREATE OR REPLACE FUNCTION public.kick_user_from_room(room_id_param UUID, user_id_param UUID, kick_reason_param TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user has permission to kick
  IF NOT (
    -- Room creator
    EXISTS (
      SELECT 1 FROM public.chat_rooms 
      WHERE id = room_id_param AND created_by = auth.uid()
    ) OR
    -- Room moderator (can't kick other moderators or room creator)
    (
      EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE room_id = room_id_param 
        AND user_id = auth.uid() 
        AND is_moderator = true 
        AND is_active = true
      ) AND
      NOT EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE room_id = room_id_param 
        AND user_id = user_id_param 
        AND is_moderator = true
      ) AND
      NOT EXISTS (
        SELECT 1 FROM public.chat_rooms 
        WHERE id = room_id_param AND created_by = user_id_param
      )
    ) OR
    -- Global admin
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to kick user';
  END IF;
  
  -- Cannot kick yourself
  IF auth.uid() = user_id_param THEN
    RAISE EXCEPTION 'Cannot kick yourself from the room';
  END IF;
  
  -- Update participant status
  UPDATE public.chat_participants 
  SET 
    is_active = false,
    kicked_at = now(),
    kicked_by = auth.uid(),
    kick_reason = kick_reason_param
  WHERE room_id = room_id_param AND user_id = user_id_param;
  
  RETURN TRUE;
END;
$$;