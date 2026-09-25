-- profiles_public.is_place_account: S2G-run place and persona accounts
-- (Gosat's Boardroom, Grove Station, Scripture Study, Companions Village,
-- Wandering Hearts, the six named companions) -- profiles.is_system and not
-- profiles.is_test. The New Chat dialog hides them: a place account is not
-- a person to DM (members reach the GoSats through the Welcome room, and
-- companions talk through their own drawer). Test accounts (is_test) are
-- also is_system but stay listed, because the suite messages them.
--
-- Only appends one column; every existing column, the view's
-- security_invoker=false and its grants are unchanged.

CREATE OR REPLACE VIEW public.profiles_public WITH (security_invoker = false) AS
 SELECT id,
    user_id,
    display_name,
    username,
    first_name,
    last_name,
    avatar_url,
    bio,
    location,
    country,
    website,
    created_at,
    updated_at,
    membership_tier,
    verification_status,
    is_chatapp_verified,
    verified_at,
    show_birthday,
    show_social_media,
    bestowal_thank_you_message,
        CASE
            WHEN COALESCE(show_birthday, false) AND date_of_birth IS NOT NULL THEN EXTRACT(month FROM date_of_birth)::integer
            ELSE NULL::integer
        END AS birthday_month,
        CASE
            WHEN COALESCE(show_birthday, false) AND date_of_birth IS NOT NULL THEN EXTRACT(day FROM date_of_birth)::integer
            ELSE NULL::integer
        END AS birthday_day,
        CASE
            WHEN COALESCE(show_social_media, false) THEN tiktok_url
            ELSE NULL::text
        END AS tiktok_url,
        CASE
            WHEN COALESCE(show_social_media, false) THEN instagram_url
            ELSE NULL::text
        END AS instagram_url,
        CASE
            WHEN COALESCE(show_social_media, false) THEN facebook_url
            ELSE NULL::text
        END AS facebook_url,
        CASE
            WHEN COALESCE(show_social_media, false) THEN twitter_url
            ELSE NULL::text
        END AS twitter_url,
        CASE
            WHEN COALESCE(show_social_media, false) THEN youtube_url
            ELSE NULL::text
        END AS youtube_url,
        CASE
            WHEN COALESCE(show_social_media, false) THEN linkedin_url
            ELSE NULL::text
        END AS linkedin_url,
        CASE
            WHEN COALESCE(show_social_media, false) THEN pinterest_url
            ELSE NULL::text
        END AS pinterest_url,
    COALESCE(is_system, false) AND NOT COALESCE(is_test, false) AS is_place_account
   FROM profiles p;
