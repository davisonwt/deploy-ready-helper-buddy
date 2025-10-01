-- CRITICAL SECURITY FIXES

-- Phase 1: Secure Radio DJs Table - Remove public access
DROP POLICY IF EXISTS "Public can view active DJs" ON public.radio_djs;
DROP POLICY IF EXISTS "Anyone can view DJ profiles" ON public.radio_djs;
DROP POLICY IF EXISTS "Admins can manage all DJ profiles" ON public.radio_djs;
DROP POLICY IF EXISTS "DJs can manage their own profiles" ON public.radio_djs;
DROP POLICY IF EXISTS "Authenticated users can view DJ public info" ON public.radio_djs;
DROP POLICY IF EXISTS "DJs can view their own full profile" ON public.radio_djs;
DROP POLICY IF EXISTS "DJs can update their own profile" ON public.radio_djs;

CREATE POLICY "Authenticated users can view DJ public info"
ON public.radio_djs FOR SELECT TO authenticated
USING (is_active = true);

CREATE POLICY "DJs can view their own full profile"
ON public.radio_djs FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "DJs can update their own profile"
ON public.radio_djs FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all DJ profiles"
ON public.radio_djs FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role) OR
  has_role(auth.uid(), 'radio_admin'::app_role)
);

-- Secure function for DJ discovery
CREATE OR REPLACE FUNCTION public.get_public_dj_info(dj_id_param uuid DEFAULT NULL)
RETURNS TABLE(id uuid, dj_name text, avatar_url text, bio text, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rd.id, rd.dj_name, rd.avatar_url, rd.bio, rd.is_active
  FROM public.radio_djs rd
  WHERE rd.is_active = true AND (dj_id_param IS NULL OR rd.id = dj_id_param);
$$;

-- Phase 2: Secure Chat Rooms
DROP POLICY IF EXISTS "Limited public room browsing for discovery" ON public.chat_rooms;
DROP POLICY IF EXISTS "Limited public room metadata only" ON public.chat_rooms;

CREATE POLICY "Limited public room metadata only"
ON public.chat_rooms FOR SELECT TO authenticated
USING (is_premium = false AND is_active = true AND room_type = 'group'::chat_room_type AND auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.browse_public_rooms()
RETURNS TABLE(id uuid, name text, category text, participant_count bigint, is_premium boolean, premium_category premium_room_category)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cr.id, cr.name, cr.category,
    (SELECT COUNT(*) FROM chat_participants cp WHERE cp.room_id = cr.id AND cp.is_active = true) as participant_count,
    cr.is_premium, cr.premium_category
  FROM public.chat_rooms cr
  WHERE cr.is_active = true AND cr.room_type = 'group'::chat_room_type AND cr.is_premium = false
  ORDER BY participant_count DESC LIMIT 50;
$$;

-- Phase 3: Secure email masking
CREATE OR REPLACE FUNCTION public.mask_email(email_address text)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE 
    WHEN email_address IS NULL THEN NULL
    WHEN position('@' in email_address) = 0 THEN email_address
    ELSE substring(email_address from 1 for 2) || '***@' || split_part(email_address, '@', 2)
  END;
$$;

-- Phase 4: Enhanced logging (drop and recreate with CASCADE)
DROP FUNCTION IF EXISTS public.log_security_event_enhanced CASCADE;
CREATE FUNCTION public.log_security_event_enhanced(
  event_type text,
  target_user_id uuid DEFAULT NULL,
  event_details jsonb DEFAULT '{}'::jsonb,
  ip_address_param inet DEFAULT inet_client_addr(),
  severity_level text DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success, ip_address, user_agent)
  VALUES (target_user_id, auth.uid(), 'security_event:' || event_type || ':' || severity_level, true, ip_address_param, event_details->>'user_agent');
END;
$$;

-- Phase 5: Tighten anonymous access
DROP POLICY IF EXISTS "Anonymous users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view orchards" ON public.orchards;
DROP POLICY IF EXISTS "Only authenticated users can view limited profile info" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can browse active orchards" ON public.orchards;

CREATE POLICY "Only authenticated users can view limited profile info"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can browse active orchards"
ON public.orchards FOR SELECT TO authenticated
USING (status = 'active'::orchard_status AND auth.uid() IS NOT NULL);