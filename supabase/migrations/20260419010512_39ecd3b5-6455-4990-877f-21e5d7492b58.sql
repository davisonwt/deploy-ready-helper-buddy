
-- 1) whisperer_referral_links: remove public is_active branch
DROP POLICY IF EXISTS "Whisperers can view own referral links" ON public.whisperer_referral_links;
CREATE POLICY "Whisperers can view own referral links"
ON public.whisperer_referral_links
FOR SELECT
TO authenticated
USING (
  whisperer_id IN (SELECT id FROM public.whisperers WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'gosat'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) user_referrals: remove the open "read by code" policy
DROP POLICY IF EXISTS "Users can read referral by code" ON public.user_referrals;

-- 3) Recreate profiles_public WITHOUT security definer; explicitly security_invoker
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT id, user_id, display_name, username, avatar_url, bio, location, country,
       created_at, updated_at, verification_status, is_chatapp_verified,
       website, tiktok_url, instagram_url, facebook_url, twitter_url, youtube_url,
       show_social_media
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated, anon;

-- 4) Storage: make chat-files bucket private and lock down policies
UPDATE storage.buckets SET public = false WHERE id = 'chat-files';

-- Drop overly broad public/legacy policies
DROP POLICY IF EXISTS "Chat files are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Public read chat_files" ON storage.objects;
DROP POLICY IF EXISTS "chat_files_policy" ON storage.objects;

-- Participant-scoped read policies for both buckets, matching public.chat_files RLS
CREATE POLICY "Chat files readable by room participants (chat-files)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND EXISTS (
    SELECT 1
    FROM public.chat_files cf
    JOIN public.chat_participants cp
      ON cp.room_id = cf.room_id
     AND cp.user_id = auth.uid()
     AND cp.is_active = true
    WHERE cf.file_path = storage.objects.name
  )
);

CREATE POLICY "Chat files readable by room participants (chat_files)"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat_files'
  AND EXISTS (
    SELECT 1
    FROM public.chat_files cf
    JOIN public.chat_participants cp
      ON cp.room_id = cf.room_id
     AND cp.user_id = auth.uid()
     AND cp.is_active = true
    WHERE cf.file_path = storage.objects.name
  )
);

-- 5) Null out any leftover plaintext credentials in wallet tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization_wallets' AND column_name='api_key') THEN
    EXECUTE 'UPDATE public.organization_wallets SET api_key = NULL WHERE api_key IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organization_wallets' AND column_name='api_secret') THEN
    EXECUTE 'UPDATE public.organization_wallets SET api_secret = NULL WHERE api_secret IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_wallets' AND column_name='api_key') THEN
    EXECUTE 'UPDATE public.user_wallets SET api_key = NULL WHERE api_key IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_wallets' AND column_name='api_secret') THEN
    EXECUTE 'UPDATE public.user_wallets SET api_secret = NULL WHERE api_secret IS NOT NULL';
  END IF;
END $$;
