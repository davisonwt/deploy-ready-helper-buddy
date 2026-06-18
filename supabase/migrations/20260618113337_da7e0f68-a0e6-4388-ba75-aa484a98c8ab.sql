
-- 3A: Live stream credential lockdown
DROP POLICY IF EXISTS "Public can view live streams" ON public.live_streams;

-- Ensure owner-only SELECT on the raw table (keeps stream_key/rtmp_url private even via Realtime)
DROP POLICY IF EXISTS "Owners can view their own live streams" ON public.live_streams;
CREATE POLICY "Owners can view their own live streams"
  ON public.live_streams
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE SELECT ON public.live_streams FROM anon;

-- Safe public view: no stream_key, no rtmp_url
CREATE OR REPLACE VIEW public.public_live_streams
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  title,
  description,
  tags,
  quality,
  status,
  hls_url,
  thumbnail_url,
  viewer_count,
  started_at,
  ended_at,
  recording_url,
  recorded_at,
  created_at
FROM public.live_streams
WHERE status IN ('live', 'ended');

GRANT SELECT ON public.public_live_streams TO anon, authenticated;
