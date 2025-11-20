-- Create function to get all user profiles for selection (like in chat user selector)
CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
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
  WHERE p.user_id != auth.uid() -- Exclude current user
  ORDER BY p.display_name NULLS LAST, p.first_name NULLS LAST
  LIMIT 200; -- Reasonable limit to prevent performance issues
$$;

COMMENT ON FUNCTION public.get_all_user_profiles() IS 
'Returns all user profiles for selection (e.g., in chat user selector). Excludes current user. Limited to 200 results for performance.';