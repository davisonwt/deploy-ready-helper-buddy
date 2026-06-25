
-- 1. Revoke anonymous access to the file_url column on both tables
REVOKE SELECT (file_url) ON public.products FROM anon;
REVOKE SELECT (file_url) ON public.dj_music_tracks FROM anon;

-- 2. Helper: get product file_url only if caller is owner / purchaser / bestower
CREATE OR REPLACE FUNCTION public.get_product_file_url(_product_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_owner uuid;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.file_url, s.user_id
    INTO v_url, v_owner
  FROM public.products p
  JOIN public.sowers s ON s.id = p.sower_id
  WHERE p.id = _product_id;

  IF v_url IS NULL THEN
    RETURN NULL;
  END IF;

  -- Owner / uploader
  IF v_owner = v_user THEN
    RETURN v_url;
  END IF;

  -- Buyer via unified content_purchases ledger
  IF EXISTS (
    SELECT 1 FROM public.content_purchases
    WHERE buyer_id = v_user
      AND status = 'completed'
      AND content_id = _product_id
  ) THEN
    RETURN v_url;
  END IF;

  -- Legacy: product bestowals
  IF EXISTS (
    SELECT 1 FROM public.product_bestowals
    WHERE product_id = _product_id
      AND bestower_id = v_user
  ) THEN
    RETURN v_url;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_file_url(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_product_file_url(uuid) FROM anon, public;

-- 3. Helper: get dj_music_tracks file_url only if caller is owner / purchaser
CREATE OR REPLACE FUNCTION public.get_dj_track_file_url(_track_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_owner uuid;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT t.file_url, d.user_id
    INTO v_url, v_owner
  FROM public.dj_music_tracks t
  JOIN public.radio_djs d ON d.id = t.dj_id
  WHERE t.id = _track_id;

  IF v_url IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_owner = v_user THEN
    RETURN v_url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.music_purchases
    WHERE track_id = _track_id
      AND buyer_id = v_user
      AND status = 'completed'
  ) THEN
    RETURN v_url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.content_purchases
    WHERE buyer_id = v_user
      AND status = 'completed'
      AND content_id = _track_id
      AND content_type = 'music_track'
  ) THEN
    RETURN v_url;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dj_track_file_url(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_dj_track_file_url(uuid) FROM anon, public;
