
DROP VIEW IF EXISTS public.tribal_hearts_browse;

CREATE OR REPLACE FUNCTION public.get_hearts_browse(
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  display_first_name text,
  age int,
  gender text,
  seeking text,
  seeking_intent text,
  age_verified boolean,
  photo_verified boolean,
  bio text,
  values_list text[],
  interests text[],
  location_country text,
  location_region text,
  photos text[],
  voice_note_url text,
  voice_note_duration_sec int,
  last_active_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_first_name,
    CASE WHEN p.birthdate IS NOT NULL
         THEN EXTRACT(YEAR FROM age(p.birthdate))::int
         ELSE NULL END AS age,
    (p.gender)::text,
    (p.seeking)::text,
    p.seeking_intent,
    p.age_verified,
    p.photo_verified,
    p.bio,
    p.values_list,
    p.interests,
    p.location_country,
    p.location_region,
    p.photos,
    p.voice_note_url,
    p.voice_note_duration_sec,
    p.last_active_at
  FROM public.tribal_hearts_profiles p
  WHERE p.status = 'active'
    AND auth.uid() IS NOT NULL
    AND public.is_tribal_hearts_member(auth.uid())
    AND public.get_hearts_gender(auth.uid()) IS NOT NULL
    AND (p.gender)::text <> public.get_hearts_gender(auth.uid())
    AND p.user_id <> auth.uid()
  ORDER BY p.last_active_at DESC NULLS LAST
  LIMIT GREATEST(p_limit, 0)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.get_hearts_browse(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_hearts_browse(int, int) TO authenticated;
