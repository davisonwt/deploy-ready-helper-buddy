
-- Re-add a broad SELECT policy so the 77+ files that query profiles don't break
-- Column-level privileges will protect PII columns instead
CREATE POLICY "Authenticated users can view basic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- REVOKE SELECT on PII columns from authenticated and anon roles
-- This means even with USING(true), these columns return NULL for non-service_role queries
REVOKE SELECT (email, phone) ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone) ON public.profiles FROM anon;

-- Create a SECURITY DEFINER function for authorized PII access (gosat or self)
CREATE OR REPLACE FUNCTION public.get_user_pii(target_user_id uuid)
RETURNS TABLE(email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.email, p.phone
  FROM public.profiles p
  WHERE p.user_id = target_user_id
    AND (
      auth.uid() = target_user_id  -- User viewing own data
      OR has_role(auth.uid(), 'gosat'::app_role)  -- Gosat role
      OR has_role(auth.uid(), 'admin'::app_role)  -- Admin role
    );
$$;

-- Create a bulk version for the gosat dashboard
CREATE OR REPLACE FUNCTION public.get_users_pii(user_ids uuid[])
RETURNS TABLE(user_id uuid, email text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.email, p.phone
  FROM public.profiles p
  WHERE p.user_id = ANY(user_ids)
    AND (
      has_role(auth.uid(), 'gosat'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    );
$$;
