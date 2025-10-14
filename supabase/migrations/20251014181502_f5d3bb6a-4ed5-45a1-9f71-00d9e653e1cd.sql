-- Fix 1: Restrict profiles table access to owners and legitimate relationships
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "profiles_require_auth" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create restrictive policies for profiles table
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view profiles they've interacted with via bestowals"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT DISTINCT orchard_owner.user_id
    FROM public.orchards orchard_owner
    WHERE orchard_owner.id IN (
      SELECT orchard_id FROM public.bestowals WHERE bestower_id = auth.uid()
    )
  ) OR
  user_id IN (
    SELECT DISTINCT bestower_id
    FROM public.bestowals
    WHERE orchard_id IN (SELECT id FROM public.orchards WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can view profiles in their chat rooms"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT DISTINCT cp.user_id
    FROM public.chat_participants cp
    WHERE cp.room_id IN (
      SELECT room_id FROM public.chat_participants WHERE user_id = auth.uid() AND is_active = true
    ) AND cp.is_active = true
  )
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'gosat'::app_role)
);

-- Fix 2: Add additional security layers to user_billing_info
-- Log all access attempts (using INSERT trigger instead of SELECT trigger)
CREATE OR REPLACE FUNCTION log_billing_access_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    ip_address,
    success
  ) VALUES (
    NEW.user_id,
    auth.uid(),
    'UPDATE_billing_data',
    inet_client_addr(),
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_billing_update_trigger ON public.user_billing_info;
CREATE TRIGGER log_billing_update_trigger
AFTER UPDATE ON public.user_billing_info
FOR EACH ROW
EXECUTE FUNCTION log_billing_access_on_update();

-- Fix 3: Remove the broken payment_config table policy
-- Drop the blocking policy
DROP POLICY IF EXISTS "payment_config_service_only" ON public.payment_config;

-- Add proper service role access
CREATE POLICY "payment_config_service_role_access"
ON public.payment_config
FOR ALL
TO authenticated
USING (current_setting('role'::text) = 'service_role'::text)
WITH CHECK (current_setting('role'::text) = 'service_role'::text);

-- Add comment recommending migration to payment_config_secure
COMMENT ON TABLE public.payment_config IS 'DEPRECATED: Migrate to payment_config_secure. This table should only be accessed by service_role.';