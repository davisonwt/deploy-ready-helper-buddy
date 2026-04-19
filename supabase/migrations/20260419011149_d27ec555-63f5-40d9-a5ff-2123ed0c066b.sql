
-- 1) profiles: remove broad authenticated-can-view policy; restrict to owner + admin/gosat
-- Public consumers should use the safe profiles_public view (no email/phone/suspended/location)
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.profiles'::regclass
      AND polname = 'Users can view own profile (full)'
  ) THEN
    CREATE POLICY "Users can view own profile (full)"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.profiles'::regclass
      AND polname = 'Admins and gosat can view all profiles'
  ) THEN
    CREATE POLICY "Admins and gosat can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'gosat'::app_role)
    );
  END IF;
END $$;

-- 2) user_points: remove public/anonymous UPDATE; restrict updates to service_role only
DROP POLICY IF EXISTS "System can update points" ON public.user_points;
DROP POLICY IF EXISTS "Anyone can update points" ON public.user_points;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.user_points'::regclass
      AND polname = 'Service role can update points'
  ) THEN
    CREATE POLICY "Service role can update points"
    ON public.user_points
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);
  END IF;

  -- Allow users to read their own points (no-op if exists)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.user_points'::regclass
      AND polname = 'Users can view own points'
  ) THEN
    CREATE POLICY "Users can view own points"
    ON public.user_points
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3) live_session_participants: restrict public read to authenticated only
DROP POLICY IF EXISTS "Public can view active live session participants" ON public.live_session_participants;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.live_session_participants'::regclass
      AND polname = 'Authenticated users can view active participants'
  ) THEN
    CREATE POLICY "Authenticated users can view active participants"
    ON public.live_session_participants
    FOR SELECT
    TO authenticated
    USING (status = 'active');
  END IF;
END $$;

-- 4) Storage: remove broad public listing on storage.objects for sensitive public buckets.
--    Keep direct-by-URL access (signed/public) but block enumeration via SELECT.
--    Drop overly permissive listing policies; legitimate read-by-known-path still works for true public buckets where appropriate.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can list" ON storage.objects;
