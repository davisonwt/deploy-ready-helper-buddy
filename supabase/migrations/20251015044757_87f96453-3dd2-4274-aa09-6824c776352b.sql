-- Create co-host invites table
CREATE TABLE IF NOT EXISTS public.radio_co_host_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.radio_schedule(id) ON DELETE CASCADE,
  host_dj_id UUID NOT NULL REFERENCES public.radio_djs(id) ON DELETE CASCADE,
  co_host_dj_id UUID NOT NULL REFERENCES public.radio_djs(id) ON DELETE CASCADE,
  co_host_user_id UUID NOT NULL,
  invitation_message TEXT,
  co_host_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(schedule_id, co_host_dj_id)
);

-- Enable RLS
ALTER TABLE public.radio_co_host_invites ENABLE ROW LEVEL SECURITY;

-- Co-hosts can view their own invites
CREATE POLICY "Co-hosts can view their invites"
ON public.radio_co_host_invites
FOR SELECT
USING (
  auth.uid() = co_host_user_id
  OR host_dj_id IN (SELECT id FROM radio_djs WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gosat'::app_role)
  OR has_role(auth.uid(), 'radio_admin'::app_role)
);

-- Hosts can create invites for their shows
CREATE POLICY "Hosts can create invites"
ON public.radio_co_host_invites
FOR INSERT
WITH CHECK (
  host_dj_id IN (SELECT id FROM radio_djs WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gosat'::app_role)
  OR has_role(auth.uid(), 'radio_admin'::app_role)
);

-- Co-hosts can update their own invites (respond)
CREATE POLICY "Co-hosts can update their invites"
ON public.radio_co_host_invites
FOR UPDATE
USING (auth.uid() = co_host_user_id);

-- Hosts and admins can delete invites
CREATE POLICY "Hosts can delete invites"
ON public.radio_co_host_invites
FOR DELETE
USING (
  host_dj_id IN (SELECT id FROM radio_djs WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gosat'::app_role)
  OR has_role(auth.uid(), 'radio_admin'::app_role)
);

-- Function to notify co-host when invited
CREATE OR REPLACE FUNCTION notify_cohost_invite()
RETURNS TRIGGER AS $$
DECLARE
  host_name TEXT;
  show_name TEXT;
  show_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get host DJ name
  SELECT dj_name INTO host_name
  FROM radio_djs
  WHERE id = NEW.host_dj_id;

  -- Get show details
  SELECT sh.show_name, rs.start_time
  INTO show_name, show_time
  FROM radio_schedule rs
  JOIN radio_shows sh ON rs.show_id = sh.id
  WHERE rs.id = NEW.schedule_id;

  -- Create notification
  INSERT INTO user_notifications (
    user_id,
    type,
    title,
    message,
    action_url
  ) VALUES (
    NEW.co_host_user_id,
    'cohost_invite',
    '🎙️ Co-Host Invitation!',
    format('%s has invited you to co-host "%s" on %s', 
           host_name, 
           show_name, 
           to_char(show_time, 'Mon DD at HH24:MI')),
    '/radio-management'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to send notification
CREATE TRIGGER cohost_invite_notification
AFTER INSERT ON public.radio_co_host_invites
FOR EACH ROW
EXECUTE FUNCTION notify_cohost_invite();

-- Add index for performance
CREATE INDEX idx_cohost_invites_cohost_user ON public.radio_co_host_invites(co_host_user_id);
CREATE INDEX idx_cohost_invites_status ON public.radio_co_host_invites(status);
