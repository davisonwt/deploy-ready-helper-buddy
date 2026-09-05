-- P0-4 part B (2026-09-05): profiles_public -- the ONLY sanctioned way to
-- read another member's profile.
--
-- Background. Since 2026-06-18 (migration 20260618154229) public.profiles
-- is locked by RLS to the owner's own row plus admin/gosat
-- (can_access_user_data). That is correct and is NOT changed here. But the
-- app has ~65 direct reads and ~19 embedded joins that show other members'
-- names and avatars, and under that lock they silently get nothing. A view
-- named profiles_public already exists live with security_invoker = true,
-- which makes it inherit the same lock and return nothing either.
--
-- This migration recreates profiles_public with security_invoker = false
-- (it runs as its owner, postgres, so RLS on profiles does not apply) and
-- exposes ONLY the columns the owner approved as public. Everything else --
-- email, phone, whatsapp_url, telegram_url, date_of_birth, latitude,
-- longitude, every payout_* column, solana_wallet_address, recovery and
-- security fields, suspended, last_login, garden_settings, video_credits,
-- preferences -- is deliberately absent and must never be added here.
--
-- Before running: the previous definition is worth keeping on record.
--   SELECT pg_get_viewdef('public.profiles_public', true);
--
-- anon gets SELECT because /products, /music-library, /music-track/:id and
-- /store/:slug are reachable logged out and show sower names.

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.user_id,
  p.display_name,
  p.username,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.bio,
  p.location,
  p.country,
  p.website,
  p.created_at,
  p.updated_at,
  p.membership_tier,
  p.verification_status,
  p.is_chatapp_verified,
  p.verified_at,
  p.show_birthday,
  p.show_social_media,
  p.bestowal_thank_you_message,
  CASE WHEN COALESCE(p.show_birthday, false) AND p.date_of_birth IS NOT NULL
       THEN EXTRACT(MONTH FROM p.date_of_birth)::int END AS birthday_month,
  CASE WHEN COALESCE(p.show_birthday, false) AND p.date_of_birth IS NOT NULL
       THEN EXTRACT(DAY FROM p.date_of_birth)::int END AS birthday_day,
  CASE WHEN COALESCE(p.show_social_media, false) THEN p.tiktok_url    END AS tiktok_url,
  CASE WHEN COALESCE(p.show_social_media, false) THEN p.instagram_url END AS instagram_url,
  CASE WHEN COALESCE(p.show_social_media, false) THEN p.facebook_url  END AS facebook_url,
  CASE WHEN COALESCE(p.show_social_media, false) THEN p.twitter_url   END AS twitter_url,
  CASE WHEN COALESCE(p.show_social_media, false) THEN p.youtube_url   END AS youtube_url,
  CASE WHEN COALESCE(p.show_social_media, false) THEN p.linkedin_url  END AS linkedin_url,
  CASE WHEN COALESCE(p.show_social_media, false) THEN p.pinterest_url END AS pinterest_url
FROM public.profiles p;

ALTER VIEW public.profiles_public OWNER TO postgres;

REVOKE ALL ON public.profiles_public FROM public;
GRANT SELECT ON public.profiles_public TO anon, authenticated, service_role;

COMMENT ON VIEW public.profiles_public IS
  'The ONLY sanctioned way to read another member''s profile. Runs as its owner (security_invoker = false) so it bypasses the owner-or-admin RLS on profiles, and therefore exposes ONLY approved public columns. Never add email, phone, contact URLs, date_of_birth, coordinates, payout or wallet columns, recovery/security fields, suspended, last_login or preferences here. Own-row and admin screens read public.profiles directly.';

-- Proof 1: the exact column list of the new view.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles_public'
ORDER BY ordinal_position;
