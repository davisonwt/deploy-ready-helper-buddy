
-- 1) Tighten SELECT on live_session_media
DROP POLICY IF EXISTS "Authenticated users can view session media" ON public.live_session_media;
CREATE POLICY "Authorized users can view session media"
ON public.live_session_media FOR SELECT
TO authenticated
USING (
  uploader_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.live_session_participants p
    WHERE p.session_id = live_session_media.session_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.live_session_media_purchases pu
    WHERE pu.media_id = live_session_media.id
      AND pu.buyer_id = auth.uid()
  )
);

-- 2) Restrict UPDATE on radio_seed_requests to host DJ, original requester, or admin
DROP POLICY IF EXISTS "DJs can update seed requests" ON public.radio_seed_requests;
CREATE POLICY "Hosts or requesters can update seed requests"
ON public.radio_seed_requests FOR UPDATE
TO authenticated
USING (
  requester_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.radio_live_hosts h
    WHERE h.session_id = radio_seed_requests.session_id
      AND h.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  requester_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.radio_live_hosts h
    WHERE h.session_id = radio_seed_requests.session_id
      AND h.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) Re-create owner-only SELECT policy on journal-media (defence-in-depth; bucket must also be set to private via dashboard).
DROP POLICY IF EXISTS "Users can view their own journal media" ON storage.objects;
CREATE POLICY "Users can view their own journal media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'journal-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
