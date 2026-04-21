-- Helper: fetch a user's gender without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_hearts_gender(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gender::text FROM public.tribal_hearts_profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Replace recursive policy
DROP POLICY IF EXISTS hearts_profiles_ambassador_browse ON public.tribal_hearts_profiles;

CREATE POLICY hearts_profiles_ambassador_browse
ON public.tribal_hearts_profiles
FOR SELECT
USING (
  status = 'active'::hearts_profile_status
  AND public.is_tribal_hearts_member(auth.uid())
  AND gender::text <> public.get_hearts_gender(auth.uid())
  AND public.get_hearts_gender(auth.uid()) IS NOT NULL
);