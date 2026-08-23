CREATE OR REPLACE FUNCTION public.log_whisperer_click(
  _ref_code text,
  _product_id uuid DEFAULT NULL,
  _visitor_id text DEFAULT NULL,
  _live_session_id uuid DEFAULT NULL,
  _referrer_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link public.whisperer_referral_links%ROWTYPE;
  v_id uuid;
BEGIN
  IF _ref_code IS NULL OR length(trim(_ref_code)) = 0 THEN RETURN NULL; END IF;

  SELECT * INTO v_link FROM public.whisperer_referral_links
   WHERE ref_code = upper(trim(_ref_code)) AND is_active;
  IF NOT FOUND THEN RETURN NULL; END IF;

  INSERT INTO public.whisperer_clicks (
    ref_link_id, whisperer_id, product_id, orchard_id, book_id,
    visitor_id, user_id, referrer_url, live_session_id
  ) VALUES (
    v_link.id, v_link.whisperer_id,
    COALESCE(_product_id, v_link.product_id), v_link.orchard_id, v_link.book_id,
    left(COALESCE(_visitor_id, ''), 64), auth.uid(), left(COALESCE(_referrer_url, ''), 500),
    COALESCE(_live_session_id, v_link.live_session_id)
  ) RETURNING id INTO v_id;

  UPDATE public.whisperer_referral_links
     SET total_clicks = COALESCE(total_clicks, 0) + 1, updated_at = now()
   WHERE id = v_link.id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_whisperer_click(text, uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_whisperer_click(text, uuid, text, uuid, text) TO anon, authenticated, service_role;