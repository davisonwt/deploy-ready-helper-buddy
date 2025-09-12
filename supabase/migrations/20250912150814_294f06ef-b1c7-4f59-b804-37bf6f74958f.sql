-- Create moderation-related tables and functions

-- Content reports table
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_content_type TEXT NOT NULL CHECK (reported_content_type IN ('message', 'user', 'room')),
  reported_content_id UUID NOT NULL,
  reporter_user_id UUID NOT NULL,
  report_reason TEXT NOT NULL CHECK (report_reason IN ('spam', 'harassment', 'inappropriate_content', 'hate_speech', 'violence', 'other')),
  report_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'resolved')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_action TEXT CHECK (resolution_action IN ('content_deleted', 'user_warned', 'user_suspended', 'user_banned', 'no_action')),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User moderation actions table
CREATE TABLE IF NOT EXISTS public.user_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL,
  moderator_user_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'temporary_suspend', 'permanent_ban', 'remove_penalty')),
  reason TEXT NOT NULL,
  duration_hours INTEGER, -- For temporary suspensions
  expires_at TIMESTAMP WITH TIME ZONE, -- For temporary actions
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comprehensive audit log table
CREATE TABLE IF NOT EXISTS public.moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'message', 'room', 'report')),
  target_id UUID NOT NULL,
  moderator_user_id UUID NOT NULL,
  action_details JSONB NOT NULL DEFAULT '{}',
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User status tracking (current active penalties)
CREATE TABLE IF NOT EXISTS public.user_moderation_status (
  user_id UUID PRIMARY KEY,
  current_status TEXT NOT NULL DEFAULT 'active' CHECK (current_status IN ('active', 'warned', 'suspended', 'banned')),
  status_reason TEXT,
  status_expires_at TIMESTAMP WITH TIME ZONE,
  warning_count INTEGER DEFAULT 0,
  last_action_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all moderation tables
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_moderation_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation tables (Admin and Moderator access only)
CREATE POLICY "Admins and moderators can view all reports" ON public.content_reports
  FOR ALL USING (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can view all user actions" ON public.user_moderation_actions
  FOR ALL USING (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can view audit logs" ON public.moderation_audit_log
  FOR ALL USING (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins and moderators can view user status" ON public.user_moderation_status
  FOR ALL USING (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator'));

-- Users can create reports
CREATE POLICY "Users can create reports" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

-- Function to log moderation actions
CREATE OR REPLACE FUNCTION log_moderation_action(
  action_type_param TEXT,
  target_type_param TEXT,
  target_id_param UUID,
  action_details_param JSONB DEFAULT '{}',
  reason_param TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.moderation_audit_log (
    action_type,
    target_type,
    target_id,
    moderator_user_id,
    action_details,
    reason,
    ip_address
  ) VALUES (
    action_type_param,
    target_type_param,
    target_id_param,
    auth.uid(),
    action_details_param,
    reason_param,
    inet_client_addr()
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to update user moderation status
CREATE OR REPLACE FUNCTION update_user_moderation_status(
  target_user_id UUID,
  new_status TEXT,
  reason_param TEXT DEFAULT NULL,
  expires_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  action_id_param UUID DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure only moderators/admins can call this
  IF NOT (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  INSERT INTO public.user_moderation_status (
    user_id,
    current_status,
    status_reason,
    status_expires_at,
    last_action_id,
    warning_count
  ) VALUES (
    target_user_id,
    new_status,
    reason_param,
    expires_at_param,
    action_id_param,
    CASE WHEN new_status = 'warned' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_status = EXCLUDED.current_status,
    status_reason = EXCLUDED.status_reason,
    status_expires_at = EXCLUDED.status_expires_at,
    last_action_id = EXCLUDED.last_action_id,
    warning_count = CASE 
      WHEN EXCLUDED.current_status = 'warned' THEN user_moderation_status.warning_count + 1
      WHEN EXCLUDED.current_status = 'active' THEN 0
      ELSE user_moderation_status.warning_count
    END,
    updated_at = now();
END;
$$;

-- Function to apply moderation action
CREATE OR REPLACE FUNCTION apply_moderation_action(
  target_user_id UUID,
  action_type_param TEXT,
  reason_param TEXT,
  duration_hours_param INTEGER DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_id UUID;
  expires_at_val TIMESTAMP WITH TIME ZONE;
  new_status TEXT;
BEGIN
  -- Ensure only moderators/admins can call this
  IF NOT (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Calculate expiration for temporary actions
  IF action_type_param = 'temporary_suspend' AND duration_hours_param IS NOT NULL THEN
    expires_at_val := now() + (duration_hours_param || ' hours')::INTERVAL;
  END IF;
  
  -- Determine new status
  new_status := CASE 
    WHEN action_type_param = 'warning' THEN 'warned'
    WHEN action_type_param = 'temporary_suspend' THEN 'suspended'
    WHEN action_type_param = 'permanent_ban' THEN 'banned'
    WHEN action_type_param = 'remove_penalty' THEN 'active'
    ELSE 'active'
  END;
  
  -- Insert moderation action
  INSERT INTO public.user_moderation_actions (
    target_user_id,
    moderator_user_id,
    action_type,
    reason,
    duration_hours,
    expires_at
  ) VALUES (
    target_user_id,
    auth.uid(),
    action_type_param,
    reason_param,
    duration_hours_param,
    expires_at_val
  ) RETURNING id INTO action_id;
  
  -- Update user status
  PERFORM update_user_moderation_status(
    target_user_id,
    new_status,
    reason_param,
    expires_at_val,
    action_id
  );
  
  -- Log the action
  PERFORM log_moderation_action(
    action_type_param,
    'user',
    target_user_id,
    jsonb_build_object(
      'action_id', action_id,
      'duration_hours', duration_hours_param,
      'expires_at', expires_at_val
    ),
    reason_param
  );
  
  RETURN action_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON public.content_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON public.content_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_actions_target ON public.user_moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_actions_created_at ON public.user_moderation_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_audit_log_created_at ON public.moderation_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_audit_log_moderator ON public.moderation_audit_log(moderator_user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_status_status ON public.user_moderation_status(current_status);

-- Add moderator role to app_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'moderator') THEN
        ALTER TYPE public.app_role ADD VALUE 'moderator';
    END IF;
END $$;