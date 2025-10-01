-- ============================================================================
-- FINAL 4 FUNCTIONS (corrected)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_payment_wallet_address()
RETURNS TABLE(wallet_address text, supported_tokens text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT ow.wallet_address, ow.supported_tokens
  FROM public.organization_wallets ow WHERE ow.is_active = true
  ORDER BY ow.created_at DESC LIMIT 1;
END;
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

CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id uuid)
RETURNS TABLE(id uuid, user_id uuid, display_name text, avatar_url text, bio text, verification_status text, created_at timestamp with time zone, show_social_media boolean, website text, tiktok_url text, instagram_url text, facebook_url text, twitter_url text, youtube_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id, p.display_name, p.avatar_url, p.bio, p.verification_status::text, p.created_at, p.show_social_media,
    CASE WHEN p.show_social_media = true THEN p.website ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.tiktok_url ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.instagram_url ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.facebook_url ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.twitter_url ELSE NULL END,
    CASE WHEN p.show_social_media = true THEN p.youtube_url ELSE NULL END
  FROM public.profiles p WHERE p.user_id = profile_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile_safe(target_user_id uuid)
RETURNS TABLE(display_name text, avatar_url text, bio text, show_social_media boolean, website text, tiktok_url text, instagram_url text, facebook_url text, twitter_url text, youtube_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.display_name, p.avatar_url, p.bio, COALESCE(p.show_social_media, false) as show_social_media,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.website ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.tiktok_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.instagram_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.facebook_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.twitter_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.youtube_url ELSE NULL END
  FROM public.profiles p WHERE p.user_id = target_user_id;
$$;

-- Security completion log
INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success)
VALUES (NULL, NULL, 'database_functions_secured_completed', true);