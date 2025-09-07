-- Create radio show files table for uploads
CREATE TABLE IF NOT EXISTS public.radio_show_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL,
  show_id UUID NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'music', 'document'
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  upload_purpose TEXT NOT NULL, -- 'cover_image', 'intro_music', 'outro_music', 'background_music', 'show_notes', 'script'
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.radio_show_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for radio_show_files
CREATE POLICY "DJs can upload files for their own shows" 
ON public.radio_show_files 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.radio_schedule rs 
    JOIN public.radio_djs rd ON rs.dj_id = rd.id
    WHERE rs.id = schedule_id AND rd.user_id = auth.uid()
  )
);

CREATE POLICY "DJs can view their own show files" 
ON public.radio_show_files 
FOR SELECT 
USING (
  uploaded_by = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role) OR
  has_role(auth.uid(), 'radio_admin'::app_role)
);

CREATE POLICY "DJs can update their own show files" 
ON public.radio_show_files 
FOR UPDATE 
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "DJs can delete their own show files" 
ON public.radio_show_files 
FOR DELETE 
USING (uploaded_by = auth.uid());

-- Add approval_notes column to radio_schedule for gosat feedback
ALTER TABLE public.radio_schedule 
ADD COLUMN IF NOT EXISTS approval_notes TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT true;

-- Create storage bucket for radio show files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'radio-show-files', 
  'radio-show-files', 
  false,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
    'application/pdf', 'text/plain', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for radio show files
CREATE POLICY "DJs can upload show files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'radio-show-files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "DJs can view their own show files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'radio-show-files' AND (
    (storage.foldername(name))[1] = auth.uid()::text OR
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role) OR
    has_role(auth.uid(), 'radio_admin'::app_role)
  )
);

CREATE POLICY "DJs can update their own show files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'radio-show-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "DJs can delete their own show files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'radio-show-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Function to notify gosats about new radio slot requests
CREATE OR REPLACE FUNCTION public.notify_gosats_radio_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gosat_user RECORD;
  show_details RECORD;
  dj_details RECORD;
BEGIN
  -- Only notify for pending requests
  IF NEW.approval_status = 'pending' AND NEW.requires_review = true THEN
    -- Get show and DJ details
    SELECT * INTO show_details FROM public.radio_shows WHERE id = NEW.show_id;
    SELECT * INTO dj_details FROM public.radio_djs WHERE id = NEW.dj_id;
    
    -- Notify all gosats and radio admins
    FOR gosat_user IN 
      SELECT DISTINCT ur.user_id 
      FROM public.user_roles ur 
      WHERE ur.role IN ('gosat', 'admin', 'radio_admin')
    LOOP
      INSERT INTO public.user_notifications (
        user_id,
        type,
        title,
        message,
        action_url,
        metadata
      ) VALUES (
        gosat_user.user_id,
        'radio_slot_request',
        'New Radio Slot Request',
        format('DJ %s wants to host "%s" on %s at %s:00. Review and approve their request.',
          dj_details.dj_name,
          show_details.show_name,
          NEW.time_slot_date::text,
          LPAD(NEW.hour_slot::text, 2, '0')
        ),
        '/admin/radio-management',
        jsonb_build_object(
          'schedule_id', NEW.id,
          'show_id', NEW.show_id,
          'dj_id', NEW.dj_id,
          'time_slot', NEW.time_slot_date::text || ' ' || LPAD(NEW.hour_slot::text, 2, '0') || ':00'
        )
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for gosat notifications
DROP TRIGGER IF EXISTS notify_gosats_on_radio_request ON public.radio_schedule;
CREATE TRIGGER notify_gosats_on_radio_request
  AFTER INSERT ON public.radio_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_gosats_radio_request();

-- Function to approve radio slot requests
CREATE OR REPLACE FUNCTION public.approve_radio_slot(
  schedule_id_param UUID,
  approval_notes_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  schedule_record RECORD;
  dj_record RECORD;
BEGIN
  -- Check if user has permission to approve
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role) OR
    has_role(auth.uid(), 'radio_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve radio slots';
  END IF;
  
  -- Get schedule and DJ details
  SELECT * INTO schedule_record FROM public.radio_schedule WHERE id = schedule_id_param;
  SELECT * INTO dj_record FROM public.radio_djs WHERE id = schedule_record.dj_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Radio slot not found';
  END IF;
  
  -- Update approval status
  UPDATE public.radio_schedule 
  SET 
    approval_status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    approval_notes = approval_notes_param,
    requires_review = false
  WHERE id = schedule_id_param;
  
  -- Notify the DJ
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    message,
    action_url
  ) VALUES (
    dj_record.user_id,
    'radio_slot_approved',
    'Radio Slot Approved! 🎉',
    format('Your radio slot for %s at %s:00 has been approved! You can now go live during your scheduled time.',
      schedule_record.time_slot_date::text,
      LPAD(schedule_record.hour_slot::text, 2, '0')
    ),
    '/grove-station'
  );
  
  RETURN true;
END;
$$;

-- Function to reject radio slot requests
CREATE OR REPLACE FUNCTION public.reject_radio_slot(
  schedule_id_param UUID,
  rejection_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  schedule_record RECORD;
  dj_record RECORD;
BEGIN
  -- Check if user has permission to reject
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gosat'::app_role) OR
    has_role(auth.uid(), 'radio_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to reject radio slots';
  END IF;
  
  -- Get schedule and DJ details
  SELECT * INTO schedule_record FROM public.radio_schedule WHERE id = schedule_id_param;
  SELECT * INTO dj_record FROM public.radio_djs WHERE id = schedule_record.dj_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Radio slot not found';
  END IF;
  
  -- Update approval status
  UPDATE public.radio_schedule 
  SET 
    approval_status = 'rejected',
    approved_by = auth.uid(),
    approved_at = now(),
    approval_notes = rejection_reason,
    requires_review = false
  WHERE id = schedule_id_param;
  
  -- Notify the DJ
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    message,
    action_url
  ) VALUES (
    dj_record.user_id,
    'radio_slot_rejected',
    'Radio Slot Request Update',
    format('Your radio slot request for %s at %s:00 needs some adjustments. Reason: %s',
      schedule_record.time_slot_date::text,
      LPAD(schedule_record.hour_slot::text, 2, '0'),
      rejection_reason
    ),
    '/grove-station'
  );
  
  RETURN true;
END;
$$;