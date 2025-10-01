-- ============================================================================
-- CORRECTED FINAL SECURITY FIX - Using Only Existing Fields
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_safe_profile_fields()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ARRAY['id', 'user_id', 'display_name', 'avatar_url', 'bio', 'created_at', 'show_social_media', 'website', 'tiktok_url', 'instagram_url', 'facebook_url', 'twitter_url', 'youtube_url', 'verification_status']::text[];
$$;

CREATE OR REPLACE FUNCTION public.get_user_display_info(target_user_id uuid)
RETURNS TABLE(display_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p.display_name, p.first_name || ' ' || p.last_name, 'Anonymous User') as display_name, p.avatar_url
  FROM public.profiles p WHERE p.user_id = target_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_safe(target_user_id uuid)
RETURNS TABLE(display_name text, avatar_url text, bio text, show_social_media boolean, website text, tiktok_url text, instagram_url text, facebook_url text, twitter_url text, youtube_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.display_name, p.avatar_url, p.bio,
    COALESCE(p.show_social_media, false) as show_social_media,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.website ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.tiktok_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.instagram_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.facebook_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.twitter_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.youtube_url ELSE NULL END
  FROM public.profiles p WHERE p.user_id = target_user_id;
$$;

-- Final completion log
INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success)
VALUES (NULL, NULL, 'all_security_functions_finally_secured', true);