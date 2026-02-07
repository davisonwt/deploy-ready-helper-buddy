-- Create a public-safe profile table (no email/phone/PII)
CREATE TABLE IF NOT EXISTS public.public_profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  username text,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can read public profile fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='public_profiles' AND policyname='Public can read public profiles'
  ) THEN
    CREATE POLICY "Public can read public profiles"
    ON public.public_profiles
    FOR SELECT
    TO public
    USING (true);
  END IF;
END $$;

-- Only the user can upsert their own public profile row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='public_profiles' AND policyname='Users can upsert own public profile'
  ) THEN
    CREATE POLICY "Users can upsert own public profile"
    ON public.public_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own public profile"
    ON public.public_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Sync function from profiles -> public_profiles
CREATE OR REPLACE FUNCTION public.sync_public_profiles_from_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.public_profiles (user_id, display_name, username, avatar_url, updated_at)
  VALUES (NEW.user_id, NEW.display_name, NEW.username, NEW.avatar_url, now())
  ON CONFLICT (user_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        username = EXCLUDED.username,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = now();
  RETURN NEW;
END;
$$;

-- Backfill existing rows
INSERT INTO public.public_profiles (user_id, display_name, username, avatar_url, updated_at)
SELECT user_id, display_name, username, avatar_url, now()
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      username = EXCLUDED.username,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = now();

-- Create trigger (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_sync_public_profiles_from_profiles'
  ) THEN
    CREATE TRIGGER trg_sync_public_profiles_from_profiles
    AFTER INSERT OR UPDATE OF display_name, username, avatar_url
    ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_public_profiles_from_profiles();
  END IF;
END $$;