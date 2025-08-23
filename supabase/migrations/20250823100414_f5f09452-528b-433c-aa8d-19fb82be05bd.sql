-- Create radio live messages table for listener-host communication
CREATE TABLE public.radio_live_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  message_type text NOT NULL DEFAULT 'listener_message',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create radio message responses table for host replies
CREATE TABLE public.radio_message_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.radio_live_messages(id) ON DELETE CASCADE,
  responder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create radio call queue table for listener call-ins
CREATE TABLE public.radio_call_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.radio_live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text,
  status text NOT NULL DEFAULT 'waiting',
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.radio_live_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_message_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_call_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for radio_live_messages
CREATE POLICY "Authenticated users can insert messages" 
ON public.radio_live_messages 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Hosts can view all messages for their session" 
ON public.radio_live_messages 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.radio_live_hosts rh
    WHERE rh.session_id = radio_live_messages.session_id
    AND rh.user_id = auth.uid()
    AND rh.is_active = true
  ) OR 
  auth.uid() = sender_id OR 
  has_role(auth.uid(), 'radio_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

CREATE POLICY "Hosts can update messages" 
ON public.radio_live_messages 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.radio_live_hosts rh
    WHERE rh.session_id = radio_live_messages.session_id
    AND rh.user_id = auth.uid()
    AND rh.is_active = true
  ) OR 
  has_role(auth.uid(), 'radio_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

-- RLS Policies for radio_message_responses
CREATE POLICY "Hosts can insert responses" 
ON public.radio_message_responses 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = responder_id AND (
    EXISTS (
      SELECT 1 FROM public.radio_live_hosts rh
      WHERE rh.session_id = radio_message_responses.session_id
      AND rh.user_id = auth.uid()
      AND rh.is_active = true
    ) OR 
    has_role(auth.uid(), 'radio_admin'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role)
  )
);

CREATE POLICY "Users can view responses to their messages" 
ON public.radio_message_responses 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.radio_live_messages rm
    WHERE rm.id = radio_message_responses.message_id
    AND rm.sender_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM public.radio_live_hosts rh
    WHERE rh.session_id = radio_message_responses.session_id
    AND rh.user_id = auth.uid()
    AND rh.is_active = true
  ) OR 
  has_role(auth.uid(), 'radio_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

-- RLS Policies for radio_call_queue
CREATE POLICY "Authenticated users can join call queue" 
ON public.radio_call_queue 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view and update their own queue entries" 
ON public.radio_call_queue 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Hosts can manage call queue" 
ON public.radio_call_queue 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.radio_live_hosts rh
    WHERE rh.session_id = radio_call_queue.session_id
    AND rh.user_id = auth.uid()
    AND rh.is_active = true
  ) OR 
  has_role(auth.uid(), 'radio_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

-- Add indexes for better performance
CREATE INDEX idx_radio_live_messages_session_id ON public.radio_live_messages(session_id);
CREATE INDEX idx_radio_live_messages_sender_id ON public.radio_live_messages(sender_id);
CREATE INDEX idx_radio_live_messages_created_at ON public.radio_live_messages(created_at);

CREATE INDEX idx_radio_message_responses_message_id ON public.radio_message_responses(message_id);
CREATE INDEX idx_radio_message_responses_session_id ON public.radio_message_responses(session_id);

CREATE INDEX idx_radio_call_queue_session_id ON public.radio_call_queue(session_id);
CREATE INDEX idx_radio_call_queue_user_id ON public.radio_call_queue(user_id);
CREATE INDEX idx_radio_call_queue_status ON public.radio_call_queue(status);
CREATE INDEX idx_radio_call_queue_created_at ON public.radio_call_queue(created_at);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_live_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_message_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.radio_call_queue;