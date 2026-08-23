CREATE OR REPLACE FUNCTION public.books_backfill_products(_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_owner uuid; v_cur text; v_enabled boolean; v_count integer := 0;
BEGIN
  SELECT c.owner_user_id, c.currency, c.books_enabled
    INTO v_owner, v_cur, v_enabled
    FROM public.companies c WHERE c.id = _business_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised for this business';
  END IF;
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN 0;
  END IF;

  WITH src AS (
    SELECT p.*
      FROM public.products p
      LEFT JOIN public.sowers s ON s.id = p.sower_id
     WHERE p.company_id = _business_id
        OR (p.company_id IS NULL AND s.user_id = v_owner)
  ), ins AS (
    INSERT INTO public.books_items (business_id, product_id, name, description, kind, sku, unit_price, currency, source, active)
    SELECT _business_id, src.id, COALESCE(src.title,'Untitled'), src.description,
           COALESCE(src.type,'product'), src.sku, COALESCE(src.price,0), COALESCE(v_cur,'USD'), 'marketplace',
           COALESCE(src.status,'active') <> 'archived'
      FROM src
    ON CONFLICT (business_id, product_id) WHERE product_id IS NOT NULL
    DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, kind = EXCLUDED.kind,
                  sku = EXCLUDED.sku, unit_price = EXCLUDED.unit_price, active = EXCLUDED.active,
                  updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM ins;

  RETURN v_count;
END; $$;

GRANT EXECUTE ON FUNCTION public.books_backfill_products(uuid) TO authenticated;