
-- 1) profiles: drop overly broad SELECT
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Ensure owner can read own row
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles'
      AND policyname='Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON public.profiles
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2) community_drivers: drop broad approved-visibility policy
DROP POLICY IF EXISTS "Authenticated users can view approved drivers" ON public.community_drivers;

-- 3) service_providers: drop broad approved-visibility policy
DROP POLICY IF EXISTS "Authenticated can view approved service providers" ON public.service_providers;

-- 4) providers: drop broad approved-visibility policy
DROP POLICY IF EXISTS "Anyone can read approved providers" ON public.providers;

-- 5) storage.objects: drop broad bucket-only DELETE/UPDATE policies
DROP POLICY IF EXISTS "Allow DJs to delete their own music" ON storage.objects;
DROP POLICY IF EXISTS "Allow DJs to update their own music" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files in dj-music" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files in dj-music" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files in music-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files in music-tracks" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own stay photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own stay photos" ON storage.objects;

-- Add folder-scoped stay-photos policies (replacement)
CREATE POLICY "Owners can update own stay photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'stay-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete own stay photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'stay-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
