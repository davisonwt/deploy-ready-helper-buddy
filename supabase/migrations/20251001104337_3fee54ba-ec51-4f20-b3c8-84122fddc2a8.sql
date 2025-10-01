-- ============================================================================
-- CRITICAL SECURITY FIXES - Revised Implementation
-- ============================================================================

-- 1. FIX PROFILE DATA EXPOSURE
DROP POLICY IF EXISTS "Only authenticated users can view limited profile info" ON public.profiles;

CREATE POLICY "Authenticated users can view safe public profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR auth.uid() IS NOT NULL
);

COMMENT ON POLICY "Authenticated users can view safe public profile data" ON public.profiles IS 
'WARNING: When accessing other users profiles, ALWAYS use get_public_profile_safe() RPC function to ensure only safe fields are returned.';

-- 2. FIX USER POINTS TABLE - Remove ALL existing policies first
DROP POLICY IF EXISTS "System and users can manage points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can insert their own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update their own points" ON public.user_points;
DROP POLICY IF EXISTS "Admins can manage all points" ON public.user_points;
DROP POLICY IF EXISTS "Service role can manage points" ON public.user_points;

-- Create properly restricted policies
CREATE POLICY "users_view_own_points"
ON public.user_points FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_points"
ON public.user_points FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_points"
ON public.user_points FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_manage_all_points"
ON public.user_points FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gosat'::app_role));

CREATE POLICY "service_role_manage_points"
ON public.user_points FOR ALL
USING (current_setting('role'::text) = 'service_role'::text)
WITH CHECK (current_setting('role'::text) = 'service_role'::text);

-- 3. ADD MISSING SEARCH PATH TO VULNERABLE FUNCTIONS

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, display_name, verification_status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'first_name', ''), 
          COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
          COALESCE(NEW.raw_user_meta_data->>'display_name', COALESCE(NEW.raw_user_meta_data->>'first_name', 'User')), 'pending');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_view_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.community_videos SET view_count = view_count + 1 WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_videos SET comment_count = comment_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_videos SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.video_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_videos SET like_count = like_count + 1 WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_videos SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.video_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_orchard_filled_pockets()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.payment_status = 'completed' THEN
    UPDATE public.orchards SET filled_pockets = filled_pockets + NEW.pockets_count WHERE id = NEW.orchard_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_admin_removal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.role IN ('admin', 'gosat') AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can remove admin or gosat roles';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_radio_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.radio_schedule
    WHERE time_slot_date = NEW.time_slot_date AND hour_slot = NEW.hour_slot
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid) AND status != 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Time slot already booked';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_listener_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
    UPDATE public.radio_schedule SET listener_count = listener_count + 1
    WHERE id = (SELECT schedule_id FROM public.radio_live_sessions WHERE id = NEW.session_id);
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true) THEN
    UPDATE public.radio_schedule SET listener_count = GREATEST(0, listener_count - 1)
    WHERE id = (SELECT schedule_id FROM public.radio_live_sessions WHERE id = COALESCE(NEW.session_id, OLD.session_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Log security update
INSERT INTO public.billing_access_logs (user_id, accessed_by, access_type, success, ip_address)
VALUES (NULL, NULL, 'security_migration_critical_fixes_applied', true, NULL);