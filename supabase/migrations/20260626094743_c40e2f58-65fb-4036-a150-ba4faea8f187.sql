
-- 1. music-tracks bucket: replace broad authenticated-read policy with owner-only.
--    Buyers continue to access via the get-purchased-track-url edge function (service role).
DROP POLICY IF EXISTS "music_tracks_authenticated_read" ON storage.objects;

CREATE POLICY "music_tracks_owner_read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'music-tracks'
  AND (
    auth.uid() = owner
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 2. products.file_url: revoke column-level access from anon AND authenticated.
--    Authorized downloads go through public.get_product_file_url() (SECURITY DEFINER).
REVOKE SELECT (file_url) ON public.products FROM anon;
REVOKE SELECT (file_url) ON public.products FROM authenticated;

-- 3. radio_seed_plays: restrict reads to authenticated users.
DROP POLICY IF EXISTS "Anyone can view seed plays" ON public.radio_seed_plays;

CREATE POLICY "Authenticated users can view seed plays"
ON public.radio_seed_plays FOR SELECT
TO authenticated
USING (true);

-- 4. song_votes / community_post_votes / radio_reactions: restrict reads to authenticated users.
DROP POLICY IF EXISTS "Anyone can view vote counts" ON public.song_votes;
CREATE POLICY "Authenticated users can view vote counts"
ON public.song_votes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can view votes" ON public.community_post_votes;
CREATE POLICY "Authenticated users can view community post votes"
ON public.community_post_votes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view reactions" ON public.radio_reactions;
CREATE POLICY "Authenticated users can view reactions"
ON public.radio_reactions FOR SELECT
TO authenticated
USING (true);
