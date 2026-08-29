-- spec-books.md build order step 2 (§5): books_backfill_products() now
-- pulls only products belonging to the requested business (company_id =
-- _business_id) instead of every product across the caller's whole account
-- scope. Top-level ownership check (auth.uid() = the business's owner)
-- unchanged. sower_books has no company_id (out of scope for this spec —
-- §2 only adds company_id to products/orchards), so it keeps its existing
-- get_my_account_scope()-based filter.
CREATE OR REPLACE FUNCTION public.books_backfill_products(_business_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_cur text;
  v_enabled boolean;
  v_count integer := 0;
  v_products integer := 0;
  v_books integer := 0;
BEGIN
  SELECT c.owner_user_id, c.currency, c.books_enabled
    INTO v_owner, v_cur, v_enabled
    FROM public.companies c
   WHERE c.id = _business_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorised for this business';
  END IF;
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN 0;
  END IF;

  WITH ins AS (
    INSERT INTO public.books_items
      (business_id, product_id, book_id, name, description, kind, sku, unit_price, currency, source, active)
    SELECT
      _business_id,
      p.id,
      NULL,
      COALESCE(p.title, 'Untitled'),
      p.description,
      COALESCE(p.type, 'product'),
      p.sku,
      COALESCE(p.price, 0),
      COALESCE(v_cur, 'USD'),
      'marketplace',
      COALESCE(p.status, 'active') <> 'archived'
    FROM public.products p
    WHERE p.company_id = _business_id
    ON CONFLICT (business_id, product_id) WHERE product_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      kind = EXCLUDED.kind,
      sku = EXCLUDED.sku,
      unit_price = EXCLUDED.unit_price,
      active = EXCLUDED.active,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_products FROM ins;

  WITH scope AS (
    SELECT user_id FROM public.get_my_account_scope()
  ), ins AS (
    INSERT INTO public.books_items
      (business_id, product_id, book_id, name, description, kind, sku, unit_price, currency, source, active)
    SELECT
      _business_id,
      NULL,
      b.id,
      COALESCE(b.title, 'Untitled'),
      b.description,
      'book',
      b.isbn,
      COALESCE(b.bestowal_value, 0),
      COALESCE(v_cur, 'USD'),
      'marketplace-book',
      COALESCE(b.status, 'active') <> 'archived'
    FROM public.sower_books b
    WHERE b.user_id IN (SELECT user_id FROM scope)
    ON CONFLICT (business_id, book_id) WHERE book_id IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      kind = EXCLUDED.kind,
      sku = EXCLUDED.sku,
      unit_price = EXCLUDED.unit_price,
      active = EXCLUDED.active,
      updated_at = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_books FROM ins;

  v_count := v_products + v_books;
  RETURN v_count;
END;
$function$
