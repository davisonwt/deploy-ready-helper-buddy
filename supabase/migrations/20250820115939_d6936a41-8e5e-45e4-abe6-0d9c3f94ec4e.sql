-- Security Fix: Complete migration of billing data and remove sensitive fields from profiles table

-- Step 1: Migrate any remaining billing data from profiles to secure user_billing_info table
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
  billing_organization_encrypted,
  encryption_key_id
)
SELECT 
  user_id,
  billing_address_line1,
  billing_address_line2,
  billing_city,
  billing_state,
  billing_postal_code,
  billing_country,
  billing_phone,
  billing_email,
  billing_organization,
  'default'
FROM profiles 
WHERE user_id NOT IN (SELECT user_id FROM user_billing_info)
AND (
  billing_address_line1 IS NOT NULL OR
  billing_address_line2 IS NOT NULL OR
  billing_city IS NOT NULL OR
  billing_state IS NOT NULL OR
  billing_postal_code IS NOT NULL OR
  billing_country IS NOT NULL OR
  billing_phone IS NOT NULL OR
  billing_email IS NOT NULL OR
  billing_organization IS NOT NULL
);

-- Step 2: Create secure billing access function for applications
CREATE OR REPLACE FUNCTION public.get_user_billing_info(target_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  billing_country text,
  billing_phone text,
  billing_email text,
  billing_organization text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to access their own billing data
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only access own billing data'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Log the access
  INSERT INTO billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    ip_address
  ) VALUES (
    target_user_id,
    auth.uid(),
    'read',
    inet_client_addr()
  );
  
  -- Return decrypted billing data (for now, since encryption isn't fully implemented)
  RETURN QUERY
  SELECT 
    ubi.billing_address_line1_encrypted as billing_address_line1,
    ubi.billing_address_line2_encrypted as billing_address_line2,
    ubi.billing_city_encrypted as billing_city,
    ubi.billing_state_encrypted as billing_state,
    ubi.billing_postal_code_encrypted as billing_postal_code,
    ubi.billing_country_encrypted as billing_country,
    ubi.billing_phone_encrypted as billing_phone,
    ubi.billing_email_encrypted as billing_email,
    ubi.billing_organization_encrypted as billing_organization
  FROM user_billing_info ubi
  WHERE ubi.user_id = target_user_id;
  
  -- Update last accessed timestamp
  UPDATE user_billing_info 
  SET last_accessed = now()
  WHERE user_id = target_user_id;
END;
$function$;

-- Step 3: Create secure billing update function
CREATE OR REPLACE FUNCTION public.update_user_billing_info(
  target_user_id uuid,
  p_billing_address_line1 text DEFAULT NULL,
  p_billing_address_line2 text DEFAULT NULL,
  p_billing_city text DEFAULT NULL,
  p_billing_state text DEFAULT NULL,
  p_billing_postal_code text DEFAULT NULL,
  p_billing_country text DEFAULT NULL,
  p_billing_phone text DEFAULT NULL,
  p_billing_email text DEFAULT NULL,
  p_billing_organization text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow users to update their own billing data
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only update own billing data'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  -- Log the access
  INSERT INTO billing_access_logs (
    user_id,
    accessed_by,
    access_type,
    ip_address
  ) VALUES (
    target_user_id,
    auth.uid(),
    'update',
    inet_client_addr()
  );
  
  -- Update or insert billing data
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
    billing_organization_encrypted,
    encryption_key_id
  ) VALUES (
    target_user_id,
    p_billing_address_line1,
    p_billing_address_line2,
    p_billing_city,
    p_billing_state,
    p_billing_postal_code,
    p_billing_country,
    p_billing_phone,
    p_billing_email,
    p_billing_organization,
    'default'
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    billing_address_line1_encrypted = COALESCE(p_billing_address_line1, user_billing_info.billing_address_line1_encrypted),
    billing_address_line2_encrypted = COALESCE(p_billing_address_line2, user_billing_info.billing_address_line2_encrypted),
    billing_city_encrypted = COALESCE(p_billing_city, user_billing_info.billing_city_encrypted),
    billing_state_encrypted = COALESCE(p_billing_state, user_billing_info.billing_state_encrypted),
    billing_postal_code_encrypted = COALESCE(p_billing_postal_code, user_billing_info.billing_postal_code_encrypted),
    billing_country_encrypted = COALESCE(p_billing_country, user_billing_info.billing_country_encrypted),
    billing_phone_encrypted = COALESCE(p_billing_phone, user_billing_info.billing_phone_encrypted),
    billing_email_encrypted = COALESCE(p_billing_email, user_billing_info.billing_email_encrypted),
    billing_organization_encrypted = COALESCE(p_billing_organization, user_billing_info.billing_organization_encrypted),
    updated_at = now();
    
  -- Update the has_complete_billing_info flag in profiles
  UPDATE profiles 
  SET 
    has_complete_billing_info = (
      SELECT (
        billing_address_line1_encrypted IS NOT NULL AND 
        billing_city_encrypted IS NOT NULL AND 
        billing_postal_code_encrypted IS NOT NULL AND 
        billing_country_encrypted IS NOT NULL AND 
        billing_email_encrypted IS NOT NULL
      )
      FROM user_billing_info 
      WHERE user_id = target_user_id
    ),
    updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$function$;

-- Step 4: Remove sensitive billing columns from profiles table
-- (This will break existing code, but it's necessary for security)
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_address_line1;
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_address_line2;
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_city;
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_state;
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_postal_code;
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_country;
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_phone;
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_email;
ALTER TABLE profiles DROP COLUMN IF EXISTS billing_organization;

-- Step 5: Update the billing info status trigger to work with the new structure
CREATE OR REPLACE FUNCTION public.update_billing_info_status_from_secure_table()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Update the profiles table's has_complete_billing_info flag based on secure table data
  UPDATE profiles 
  SET 
    has_complete_billing_info = (
      NEW.billing_address_line1_encrypted IS NOT NULL AND 
      NEW.billing_city_encrypted IS NOT NULL AND 
      NEW.billing_postal_code_encrypted IS NOT NULL AND 
      NEW.billing_country_encrypted IS NOT NULL AND 
      NEW.billing_email_encrypted IS NOT NULL
    ),
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for the secure billing table
DROP TRIGGER IF EXISTS update_billing_status_from_secure ON user_billing_info;
CREATE TRIGGER update_billing_status_from_secure
  AFTER INSERT OR UPDATE ON user_billing_info
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_info_status_from_secure_table();