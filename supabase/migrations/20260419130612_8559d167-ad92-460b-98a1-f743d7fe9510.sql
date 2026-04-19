CREATE OR REPLACE FUNCTION public.is_active_ambassador(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.ambassador_applications
      WHERE user_id = _user_id AND status = 'approved'
    )
    OR EXISTS (
      SELECT 1 FROM public.s2g_agent_free_access
      WHERE user_id = _user_id
    );
$$;