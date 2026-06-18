
DROP POLICY IF EXISTS "DJs can view their own music files" ON storage.objects;
CREATE POLICY "DJs can view their own music files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dj-music'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND EXISTS (
    SELECT 1 FROM public.radio_djs
    WHERE radio_djs.user_id = auth.uid() AND radio_djs.is_active = true
  )
);

REVOKE SELECT (stream_key, rtmp_url) ON public.live_streams FROM anon, authenticated;
GRANT SELECT (stream_key, rtmp_url) ON public.live_streams TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_live_stream_credentials(p_stream_id uuid)
RETURNS TABLE(stream_key text, rtmp_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ls.stream_key, ls.rtmp_url
  FROM public.live_streams ls
  WHERE ls.id = p_stream_id AND ls.user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_live_stream_credentials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_live_stream_credentials(uuid) TO authenticated;

REVOKE SELECT (api_key, api_secret, merchant_id) ON public.user_wallets FROM anon, authenticated;
GRANT SELECT (api_key, api_secret, merchant_id) ON public.user_wallets TO service_role;

REVOKE SELECT (api_key, api_secret) ON public.organization_wallets FROM anon, authenticated;
GRANT SELECT (api_key, api_secret) ON public.organization_wallets TO service_role;

DROP POLICY IF EXISTS "Anyone can log a signup attempt" ON public.signup_attempts;
CREATE POLICY "Anyone can log a signup attempt"
ON public.signup_attempts FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND char_length(email) BETWEEN 3 AND 320
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (
    auth.uid() IS NULL
    OR lower(email) = lower((auth.jwt() ->> 'email'))
  )
);

REVOKE EXECUTE ON FUNCTION public.set_security_questions(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_security_questions(text, text, text, text, text, text) TO authenticated;
