
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view approved drivers" ON public.community_drivers;

CREATE POLICY "Authenticated users can view approved drivers"
ON public.community_drivers
FOR SELECT
TO authenticated
USING (status = 'approved');
