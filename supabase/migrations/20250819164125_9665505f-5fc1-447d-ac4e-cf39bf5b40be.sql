-- Phase 1: Create a secure function to gradually migrate billing data
-- This function will be used to move sensitive data from profiles to the secure billing table

CREATE OR REPLACE FUNCTION public.migrate_billing_data_for_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record record;
  billing_exists boolean;
BEGIN
  -- Only allow users to migrate their own data or admins
  IF auth.uid() != target_user_id AND NOT is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Can only migrate own billing data';
  END IF;
  
  -- Check if billing record already exists
  SELECT EXISTS(
    SELECT 1 FROM user_billing_info WHERE user_id = target_user_id
  ) INTO billing_exists;
  
  IF billing_exists THEN
    RETURN true; -- Already migrated
  END IF;
  
  -- Get profile data
  SELECT * FROM profiles WHERE user_id = target_user_id INTO profile_record;
  
  IF NOT FOUND THEN
    RETURN false; -- No profile found
  END IF;
  
  -- Insert into secure billing table (for now without encryption, we'll add that later)
  INSERT INTO user_billing_info (
    user_id,
    billing_address_line1_encrypted,
    billing_address_line2_encrypted,
    billing_city_encrypted,
    billing_state_encrypted,
    billing_postal_code_encrypted,
    billing_country_encrypted,
    billing_phone_encrypted,
    billing_email_encrypted,
    billing_organization_encrypted
  ) VALUES (
    target_user_id,
    profile_record.billing_address_line1,
    profile_record.billing_address_line2,
    profile_record.billing_city,
    profile_record.billing_state,
    profile_record.billing_postal_code,
    profile_record.billing_country,
    profile_record.billing_phone,
    profile_record.billing_email,
    profile_record.billing_organization
  );
  
  -- Log the migration
  INSERT INTO billing_access_logs (
    user_id,
    accessed_by,
    access_type
  ) VALUES (
    target_user_id,
    auth.uid(),
    'migrate'
  );
  
  RETURN true;
END;
$$;

-- Create a function to safely remove sensitive data from profiles table (Phase 2)
-- This should only be called after successful migration
CREATE OR REPLACE FUNCTION public.remove_sensitive_profile_data(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  billing_exists boolean;
BEGIN
  -- Only allow users to clean their own data or admins
  IF auth.uid() != target_user_id AND NOT is_admin_or_gosat(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Can only clean own profile data';
  END IF;
  
  -- Verify billing data exists in secure table first
  SELECT EXISTS(
    SELECT 1 FROM user_billing_info WHERE user_id = target_user_id
  ) INTO billing_exists;
  
  IF NOT billing_exists THEN
    RAISE EXCEPTION 'Cannot clean profile: billing data not found in secure table';
  END IF;
  
  -- Clear sensitive fields from profiles table
  UPDATE profiles SET
    billing_address_line1 = NULL,
    billing_address_line2 = NULL,
    billing_city = NULL,
    billing_state = NULL,
    billing_postal_code = NULL,
    billing_country = NULL,
    billing_phone = NULL,
    billing_email = NULL,
    billing_organization = NULL,
    has_complete_billing_info = false
  WHERE user_id = target_user_id;
  
  -- Log the cleanup
  INSERT INTO billing_access_logs (
    user_id,
    accessed_by,
    access_type
  ) VALUES (
    target_user_id,
    auth.uid(),
    'cleanup'
  );
  
  RETURN true;
END;
$$;

-- Create a secure view that applications can use instead of direct profiles access
CREATE OR REPLACE VIEW public.secure_profiles AS
SELECT 
  id,
  user_id,
  display_name,
  avatar_url,
  bio,
  location, -- Consider if this should also be masked
  created_at,
  preferred_currency,
  -- Use masked data for sensitive fields
  mask_email(billing_email) as billing_email_masked,
  mask_phone(billing_phone) as billing_phone_masked,
  mask_address(billing_address_line1) as billing_address_masked,
  billing_country, -- Country is generally less sensitive
  has_complete_billing_info
FROM profiles;

-- Add access control to the secure view
ALTER VIEW public.secure_profiles OWNER TO postgres;
GRANT SELECT ON public.secure_profiles TO authenticated;

-- Add comments for security documentation
COMMENT ON FUNCTION public.migrate_billing_data_for_user(uuid) IS 
'Safely migrates billing data from profiles table to secure user_billing_info table. Only the user or admin can migrate their own data.';

COMMENT ON FUNCTION public.remove_sensitive_profile_data(uuid) IS 
'Removes sensitive billing data from profiles table after successful migration to secure table. Only callable after billing data exists in secure table.';

COMMENT ON VIEW public.secure_profiles IS 
'Secure view of profiles that masks sensitive data. Applications should use this instead of direct profiles table access.';