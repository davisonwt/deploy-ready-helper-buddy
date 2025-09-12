-- First, let's check what roles exist and add moderator if needed
DO $$ 
BEGIN
    -- Add moderator role to app_role enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'app_role' AND e.enumlabel = 'moderator'
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'moderator';
    END IF;
EXCEPTION
    WHEN others THEN
        -- If app_role doesn't exist, create it
        CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'gosat');
END $$;

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
  FOR ALL USING (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins and moderators can view all user actions" ON public.user_moderation_actions
  FOR ALL USING (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins and moderators can view audit logs" ON public.moderation_audit_log
  FOR ALL USING (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins and moderators can view user status" ON public.user_moderation_status
  FOR ALL USING (is_admin_or_gosat(auth.uid()) OR has_role(auth.uid(), 'moderator'::app_role));

-- Users can create reports
CREATE POLICY "Users can create reports" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON public.content_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON public.content_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_actions_target ON public.user_moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_moderation_actions_created_at ON public.user_moderation_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_audit_log_created_at ON public.moderation_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_audit_log_moderator ON public.moderation_audit_log(moderator_user_id);