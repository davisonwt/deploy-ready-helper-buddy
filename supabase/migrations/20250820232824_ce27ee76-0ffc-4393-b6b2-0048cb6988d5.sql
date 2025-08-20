-- Fix Security Definer View Issue
-- The linter flagged the radio_sessions_public view as having SECURITY DEFINER
-- We need to recreate it without SECURITY DEFINER to be more secure

-- Drop the existing view
DROP VIEW IF EXISTS public.radio_sessions_public;

-- Recreate without SECURITY DEFINER - this will use the querying user's permissions
CREATE VIEW public.radio_sessions_public AS
SELECT 
  id,
  schedule_id,
  status,
  started_at,
  ended_at,
  viewer_count,
  created_at,
  updated_at
  -- NOTE: session_token is intentionally excluded from public view
FROM public.radio_live_sessions
WHERE status IN ('live', 'scheduled') -- Only show active/upcoming sessions
  AND auth.uid() IS NOT NULL; -- Require authentication

-- Grant SELECT to authenticated users only
GRANT SELECT ON public.radio_sessions_public TO authenticated;