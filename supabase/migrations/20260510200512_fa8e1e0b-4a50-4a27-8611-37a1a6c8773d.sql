
-- Revoke column access to RTMP credentials from anon and authenticated roles
REVOKE SELECT (stream_key, rtmp_url) ON public.live_streams FROM anon, authenticated;

-- Provide a SECURITY DEFINER helper so the owner can fetch their own credentials
CREATE OR REPLACE FUNCTION public.get_my_stream_credentials(_stream_id uuid)
RETURNS TABLE(stream_key text, rtmp_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ls.stream_key, ls.rtmp_url
  FROM public.live_streams ls
  WHERE ls.id = _stream_id
    AND ls.user_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_stream_credentials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_stream_credentials(uuid) TO authenticated;
