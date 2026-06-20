
CREATE OR REPLACE FUNCTION public.get_effective_tier(_user UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier TEXT;
  _free BOOLEAN;
  _privileged BOOLEAN;
BEGIN
  IF _user IS NULL THEN RETURN 'sower'; END IF;

  -- Gosats and admins always get the highest tier (full access to every companion)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user AND role IN ('admin'::app_role, 'gosat'::app_role)
  ) INTO _privileged;
  IF _privileged THEN RETURN 'council'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.s2g_agent_free_access
    WHERE user_id = _user AND COALESCE(is_active, true) = true
  ) INTO _free;
  IF _free THEN RETURN 'council'; END IF;

  SELECT lower(COALESCE(membership_tier, 'sower')) INTO _tier
  FROM public.profiles WHERE user_id = _user
  ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  IF _tier IS NULL THEN RETURN 'sower'; END IF;
  IF _tier IN ('sower','keeper','ambassador','council') THEN RETURN _tier; END IF;
  IF _tier ILIKE 'free%' THEN RETURN 'sower'; END IF;
  IF _tier ILIKE '%founder%' OR _tier ILIKE '%council%' THEN RETURN 'council'; END IF;
  RETURN 'sower';
END;
$$;
