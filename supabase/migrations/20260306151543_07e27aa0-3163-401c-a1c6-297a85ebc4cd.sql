
-- Force revoke on email and phone columns
REVOKE ALL (email, phone) ON public.profiles FROM authenticated, anon;
-- Re-grant SELECT on all OTHER columns explicitly
GRANT SELECT (id, user_id, first_name, last_name, display_name, avatar_url, bio, location, created_at, updated_at, preferred_currency, has_complete_billing_info, timezone, country, website, tiktok_url, instagram_url, facebook_url, twitter_url, youtube_url, show_social_media, verification_status, verifier_id, verification_chat_id, verification_expires_at, verified_at, is_chatapp_verified, username, last_login, suspended) ON public.profiles TO authenticated;
GRANT SELECT (id, user_id, first_name, last_name, display_name, avatar_url, bio, location, created_at, updated_at, preferred_currency, has_complete_billing_info, timezone, country, website, tiktok_url, instagram_url, facebook_url, twitter_url, youtube_url, show_social_media, verification_status, verifier_id, verification_chat_id, verification_expires_at, verified_at, is_chatapp_verified, username, last_login, suspended) ON public.profiles TO anon;
