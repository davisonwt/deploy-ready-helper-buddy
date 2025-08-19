-- Create a secure function for searching users by display name
-- This function only returns safe, public profile information
CREATE OR REPLACE FUNCTION public.search_user_profiles(search_term text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  avatar_url text
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
    p.avatar_url
  FROM public.profiles p
  WHERE p.display_name ILIKE '%' || search_term || '%'
  AND search_term IS NOT NULL
  AND length(trim(search_term)) > 0
  ORDER BY p.display_name
  LIMIT 20;
$$;

-- Add security comment
COMMENT ON FUNCTION public.search_user_profiles(text) IS 
'Securely searches users by display name only. Returns only safe public profile data: display_name and avatar_url. No sensitive information like names, addresses, billing info, etc. is exposed.';