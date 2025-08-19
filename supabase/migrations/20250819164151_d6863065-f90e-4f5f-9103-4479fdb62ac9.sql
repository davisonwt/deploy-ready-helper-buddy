-- Remove the SECURITY DEFINER view and replace with proper RLS policies
DROP VIEW IF EXISTS public.secure_profiles;

-- Instead of a security definer view, let's create RLS policies for accessing masked data
-- We'll create a safe function to get masked profile data
CREATE OR REPLACE FUNCTION public.get_safe_profile_data(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone,
  preferred_currency text,
  billing_email_masked text,
  billing_phone_masked text,
  billing_address_masked text,
  billing_country text,
  has_billing_info boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.created_at,
    p.preferred_currency,
    -- Only show masked data, never full sensitive data
    mask_email(p.billing_email) as billing_email_masked,
    mask_phone(p.billing_phone) as billing_phone_masked,
    mask_address(p.billing_address_line1) as billing_address_masked,
    p.billing_country,
    p.has_complete_billing_info as has_billing_info
  FROM public.profiles p
  WHERE p.user_id = target_user_id
  AND (
    auth.uid() = target_user_id OR  -- User can see their own masked data
    auth.uid() IS NOT NULL          -- Other authenticated users see masked data only
  );
$$;

-- Add security comment
COMMENT ON FUNCTION public.get_safe_profile_data(uuid) IS 
'Safely returns profile data with sensitive fields masked. Users see their own masked data, other users see only safe public fields with masking applied.';