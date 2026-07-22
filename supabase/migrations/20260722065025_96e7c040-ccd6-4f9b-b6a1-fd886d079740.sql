
DROP POLICY IF EXISTS "Users can view their own recipe media" ON storage.objects;
CREATE POLICY "Users can view their own recipe media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own videos" ON storage.objects;
CREATE POLICY "Users can view their own videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos' AND (auth.uid())::text = (storage.foldername(name))[1]);

REVOKE SELECT (wallet_address) ON public.sowers FROM anon, authenticated;
REVOKE SELECT (wallet_address) ON public.whisperers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_sower_wallet()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wallet_address FROM public.sowers WHERE user_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_sower_wallet() TO authenticated;
