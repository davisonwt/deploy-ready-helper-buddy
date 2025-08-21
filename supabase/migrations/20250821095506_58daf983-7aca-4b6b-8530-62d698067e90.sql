-- Force refresh the radio_sessions_public view to ensure no SECURITY DEFINER caching
DROP VIEW IF EXISTS public.radio_sessions_public;

-- Recreate the view with explicit security settings
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

-- Grant SELECT to authenticated users only (not SECURITY DEFINER)
GRANT SELECT ON public.radio_sessions_public TO authenticated;

-- Ensure no SECURITY DEFINER property is set
COMMENT ON VIEW public.radio_sessions_public IS 'Public view of radio sessions without sensitive data - uses invoker permissions, not definer';