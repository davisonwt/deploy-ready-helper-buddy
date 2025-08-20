-- Add subject/topic and approval fields to radio shows and schedule
ALTER TABLE public.radio_shows ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.radio_shows ADD COLUMN IF NOT EXISTS topic_description text;

ALTER TABLE public.radio_schedule ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending'::text;
ALTER TABLE public.radio_schedule ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id);
ALTER TABLE public.radio_schedule ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
ALTER TABLE public.radio_schedule ADD COLUMN IF NOT EXISTS show_subject text;
ALTER TABLE public.radio_schedule ADD COLUMN IF NOT EXISTS show_topic_description text;

-- Create function to approve radio schedule slots
CREATE OR REPLACE FUNCTION public.approve_radio_schedule_slot(
  schedule_id_param uuid,
  approver_id_param uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if approver has radio_admin or admin role
  IF NOT (
    has_role(approver_id_param, 'radio_admin'::app_role) OR 
    has_role(approver_id_param, 'admin'::app_role) OR 
    has_role(approver_id_param, 'gosat'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve radio schedule slots';
  END IF;
  
  -- Update the schedule slot
  UPDATE public.radio_schedule 
  SET 
    approval_status = 'approved',
    approved_by = approver_id_param,
    approved_at = now()
  WHERE id = schedule_id_param;
  
  RETURN true;
END;
$$;

-- Create function to reject radio schedule slots
CREATE OR REPLACE FUNCTION public.reject_radio_schedule_slot(
  schedule_id_param uuid,
  approver_id_param uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if approver has radio_admin or admin role
  IF NOT (
    has_role(approver_id_param, 'radio_admin'::app_role) OR 
    has_role(approver_id_param, 'admin'::app_role) OR 
    has_role(approver_id_param, 'gosat'::app_role)
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to reject radio schedule slots';
  END IF;
  
  -- Update the schedule slot
  UPDATE public.radio_schedule 
  SET 
    approval_status = 'rejected',
    approved_by = approver_id_param,
    approved_at = now()
  WHERE id = schedule_id_param;
  
  RETURN true;
END;
$$;