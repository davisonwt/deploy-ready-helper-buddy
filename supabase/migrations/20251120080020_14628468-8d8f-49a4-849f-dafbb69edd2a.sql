-- Drop old search function and create improved version
DROP FUNCTION IF EXISTS public.search_user_profiles(text);

-- Create improved search function that searches across multiple fields
CREATE OR REPLACE FUNCTION public.search_user_profiles(search_term text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  display_name text,
  first_name text,
  last_name text,
  username text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.first_name,
    p.last_name,
    p.username,
    p.avatar_url
  FROM public.profiles p
  WHERE 
    (
      p.display_name ILIKE '%' || search_term || '%' OR
      p.first_name ILIKE '%' || search_term || '%' OR
      p.last_name ILIKE '%' || search_term || '%' OR
      p.username ILIKE '%' || search_term || '%'
    )
    AND search_term IS NOT NULL
    AND length(trim(search_term)) > 0
    AND p.user_id != auth.uid() -- Exclude current user
  ORDER BY p.display_name NULLS LAST, p.first_name NULLS LAST
  LIMIT 50;
$$;

COMMENT ON FUNCTION public.search_user_profiles(text) IS 
'Searches users across display_name, first_name, last_name, and username. Returns public profile data. Excludes current user.';