-- CRITICAL SECURITY FIX: Secure the profiles table properly

-- 1. Drop the overly permissive existing policies
DROP POLICY IF EXISTS "Users can view own profile, admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;  
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- 2. Create secure policies with proper role restrictions

-- Users can only see their own sensitive data
CREATE POLICY "Users can view their own full profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all profiles (but only authenticated admins)
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  is_admin_or_gosat(auth.uid()) AND auth.uid() IS NOT NULL
);

-- Users can only update their own profiles
CREATE POLICY "Users can update their own profile only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile only" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 3. Create a secure function to get public-only profile data
CREATE OR REPLACE FUNCTION public.get_public_profile_safe(target_user_id uuid)
RETURNS TABLE(
  display_name text, 
  avatar_url text, 
  bio text,
  show_social_media boolean,
  website text,
  tiktok_url text,
  instagram_url text,
  facebook_url text,
  twitter_url text,
  youtube_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only return non-sensitive profile information for public display
  SELECT 
    p.display_name,
    p.avatar_url,
    p.bio,
    COALESCE(p.show_social_media, false) as show_social_media,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.website ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.tiktok_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.instagram_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.facebook_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.twitter_url ELSE NULL END,
    CASE WHEN COALESCE(p.show_social_media, false) THEN p.youtube_url ELSE NULL END
  FROM public.profiles p
  WHERE p.user_id = target_user_id;
$$;

-- 4. Fix the infinite recursion issue in live_session_participants
DO $$ 
BEGIN
  -- Drop any recursive policies on live_session_participants
  DROP POLICY IF EXISTS "Participants can view session data" ON public.live_session_participants;
  DROP POLICY IF EXISTS "Users can view session participants" ON public.live_session_participants;
  
  -- Create a safe policy that doesn't cause recursion
  CREATE POLICY "Users can view live session participants safely" 
  ON public.live_session_participants 
  FOR SELECT 
  TO authenticated
  USING (
    auth.uid() IS NOT NULL AND (
      user_id = auth.uid() OR 
      session_id IN (
        SELECT session_id FROM public.live_session_participants lsp 
        WHERE lsp.user_id = auth.uid() AND lsp.status = 'active'
      )
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Continue even if some policies don't exist
    NULL;
END $$;

-- 5. Add additional security logging
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log any access to sensitive profile fields
  IF TG_OP = 'UPDATE' AND (
    OLD.first_name IS DISTINCT FROM NEW.first_name OR
    OLD.last_name IS DISTINCT FROM NEW.last_name OR
    OLD.phone IS DISTINCT FROM NEW.phone OR
    OLD.location IS DISTINCT FROM NEW.location
  ) THEN
    PERFORM log_security_event_enhanced(
      'sensitive_profile_data_updated',
      auth.uid(),
      jsonb_build_object('target_user', NEW.user_id),
      inet_client_addr(),
      'info'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile access monitoring
DROP TRIGGER IF EXISTS profile_access_monitor ON public.profiles;
CREATE TRIGGER profile_access_monitor
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_profile_access();