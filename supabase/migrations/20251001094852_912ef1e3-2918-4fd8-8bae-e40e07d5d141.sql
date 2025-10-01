-- Critical Security Fixes Migration

-- Phase 1: Secure Radio DJs Table (Remove public access to personal data)
DROP POLICY IF EXISTS "Public can view active DJs" ON public.radio_djs;
DROP POLICY IF EXISTS "Anyone can view DJ profiles" ON public.radio_djs;
DROP POLICY IF EXISTS "radio_djs_authenticated_view_public" ON public.radio_djs;
DROP POLICY IF EXISTS "radio_djs_own_full_profile" ON public.radio_djs;
DROP POLICY IF EXISTS "radio_djs_own_update" ON public.radio_djs;
DROP POLICY IF EXISTS "radio_djs_admin_all" ON public.radio_djs;

-- New secure policies for radio_djs
CREATE POLICY "radio_djs_authenticated_view"
ON public.radio_djs FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "radio_djs_own_profile"
ON public.radio_djs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "radio_djs_own_update"
ON public.radio_djs FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "radio_djs_admin_access"
ON public.radio_djs FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role) OR
  has_role(auth.uid(), 'radio_admin'::app_role)
);

-- Secure DJ discovery function (only non-sensitive fields)
CREATE OR REPLACE FUNCTION public.get_public_dj_info(dj_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  dj_name text,
  avatar_url text,
  bio text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rd.id,
    rd.dj_name,
    rd.avatar_url,
    rd.bio,
    rd.is_active
  FROM public.radio_djs rd
  WHERE rd.is_active = true
  AND (dj_id_param IS NULL OR rd.id = dj_id_param);
$$;

-- Phase 2: Secure Chat Rooms Discovery
DROP POLICY IF EXISTS "Limited public room browsing for discovery" ON public.chat_rooms;
DROP POLICY IF EXISTS "chat_rooms_limited_discovery" ON public.chat_rooms;

CREATE POLICY "chat_rooms_auth_discovery"
ON public.chat_rooms FOR SELECT TO authenticated
USING (
  is_premium = false 
  AND is_active = true 
  AND room_type = 'group'::chat_room_type
  AND auth.uid() IS NOT NULL
);

-- Secure room browsing function
CREATE OR REPLACE FUNCTION public.browse_public_rooms()
RETURNS TABLE(
  id uuid,
  name text,
  category text,
  participant_count bigint,
  is_premium boolean,
  premium_category premium_room_category
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cr.id,
    cr.name,
    cr.category,
    (SELECT COUNT(*) FROM chat_participants cp 
     WHERE cp.room_id = cr.id AND cp.is_active = true) as participant_count,
    cr.is_premium,
    cr.premium_category
  FROM public.chat_rooms cr
  WHERE cr.is_active = true
  AND cr.room_type = 'group'::chat_room_type
  AND cr.is_premium = false
  ORDER BY participant_count DESC
  LIMIT 50;
$$;

-- Phase 3: Remove anonymous access policies
DROP POLICY IF EXISTS "Anonymous users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view orchards" ON public.orchards;
DROP POLICY IF EXISTS "profiles_authenticated_only" ON public.profiles;
DROP POLICY IF EXISTS "orchards_authenticated_active_only" ON public.orchards;

-- Require authentication for profiles
CREATE POLICY "profiles_require_auth"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Require authentication for orchards
CREATE POLICY "orchards_require_auth"
ON public.orchards FOR SELECT TO authenticated
USING (
  status = 'active'::orchard_status
  AND auth.uid() IS NOT NULL
);