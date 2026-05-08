
-- 1. live_streams: revoke sensitive column access from anon/authenticated
REVOKE SELECT (stream_key, rtmp_url) ON public.live_streams FROM anon, authenticated;

-- 2. radio-show-files: drop public read policy
DROP POLICY IF EXISTS "Anyone can view radio show files" ON storage.objects;

-- 3. session-documents: replace broad authenticated-only read with participant-scoped
DROP POLICY IF EXISTS "Users can view documents in their sessions" ON storage.objects;

-- (Existing "Session participants access documents" policy already covers correct access.)

-- 4. live_session_media: replace public-true SELECT with authenticated-only
DROP POLICY IF EXISTS "Anyone can view media in sessions" ON public.live_session_media;
CREATE POLICY "Authenticated users can view session media"
ON public.live_session_media
FOR SELECT
TO authenticated
USING (true);
