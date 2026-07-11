
-- 1) dj_music_tracks: revoke wallet_address from anon/authenticated
REVOKE SELECT (wallet_address) ON public.dj_music_tracks FROM anon, authenticated;

-- 2) whisperers: drop overbroad policy, revoke wallet_address column
DROP POLICY IF EXISTS "Whisperers are viewable by everyone" ON public.whisperers;
REVOKE SELECT ON public.whisperers FROM anon;
REVOKE SELECT (wallet_address) ON public.whisperers FROM anon, authenticated;

-- Helper: owner can read their own wallet address via RPC (bypasses column revoke)
CREATE OR REPLACE FUNCTION public.get_my_dj_track_wallet(_track_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.wallet_address
  FROM public.dj_music_tracks t
  JOIN public.radio_djs d ON d.id = t.dj_id
  WHERE t.id = _track_id AND d.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_whisperer_wallet()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wallet_address FROM public.whisperers WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_dj_track_wallet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_whisperer_wallet() TO authenticated;

-- 3) tribal_hearts_profiles: require mutual match for cross-user profile SELECT
DROP POLICY IF EXISTS hearts_profiles_matched_select ON public.tribal_hearts_profiles;
CREATE POLICY hearts_profiles_matched_select
ON public.tribal_hearts_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tribal_hearts_matches m
    WHERE m.status = 'mutual'
      AND (
        (m.member_a_id = auth.uid() AND m.member_b_id = tribal_hearts_profiles.user_id)
        OR (m.member_b_id = auth.uid() AND m.member_a_id = tribal_hearts_profiles.user_id)
      )
  )
);
