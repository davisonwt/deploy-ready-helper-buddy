
-- 1. Company internationalization + Books add-on flag
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS books_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS books_activated_at timestamptz;

-- 2. Generic statutory deductions (replaces tax_settings)
CREATE TABLE IF NOT EXISTS public.statutory_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  label text NOT NULL,
  employee_pct numeric NOT NULL DEFAULT 0,
  employer_pct numeric NOT NULL DEFAULT 0,
  wage_cap numeric,
  applies boolean NOT NULL DEFAULT true,
  tax_code text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statutory_deductions TO authenticated;
GRANT ALL ON public.statutory_deductions TO service_role;
ALTER TABLE public.statutory_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages statutory deductions"
  ON public.statutory_deductions FOR ALL TO authenticated
  USING (public.owns_company(business_id))
  WITH CHECK (public.owns_company(business_id));

DROP TABLE IF EXISTS public.tax_settings;

-- 3. Books catalog items
CREATE TABLE IF NOT EXISTS public.books_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'product',
  sku text,
  unit_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  source text NOT NULL DEFAULT 'manual',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS books_items_business_product_key
  ON public.books_items(business_id, product_id) WHERE product_id IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books_items TO authenticated;
GRANT ALL ON public.books_items TO service_role;
ALTER TABLE public.books_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages books items"
  ON public.books_items FOR ALL TO authenticated
  USING (public.owns_company(business_id))
  WITH CHECK (public.owns_company(business_id));

-- 4. Books income ledger (sales + gifts, permanently distinguishable)
CREATE TABLE IF NOT EXISTS public.books_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  income_type text NOT NULL DEFAULT 'sale' CHECK (income_type IN ('sale','gift')),
  item_id uuid REFERENCES public.books_items(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text,
  buyer_reference text,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS books_income_source_key
  ON public.books_income(source_table, source_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.books_income TO authenticated;
GRANT ALL ON public.books_income TO service_role;
ALTER TABLE public.books_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages books income"
  ON public.books_income FOR ALL TO authenticated
  USING (public.owns_company(business_id))
  WITH CHECK (public.owns_company(business_id));

-- 5. Linkable auto-posted expenses (platform fees)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS source_table text,
  ADD COLUMN IF NOT EXISTS source_id uuid,
  ADD COLUMN IF NOT EXISTS linked_income_id uuid REFERENCES public.books_income(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_source_key
  ON public.expenses(source_table, source_id) WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

-- 6. Helpers
CREATE OR REPLACE FUNCTION public.books_company_for_user(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id FROM public.companies c
   WHERE c.owner_user_id = _user_id AND c.books_enabled = true
   ORDER BY c.created_at ASC LIMIT 1
$$;

-- 7. Catalog sync from marketplace products
CREATE OR REPLACE FUNCTION public.books_sync_product_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_biz uuid; v_cur text;
BEGIN
  SELECT c.id, c.currency INTO v_biz, v_cur
    FROM public.companies c
   WHERE (NEW.company_id IS NOT NULL AND c.id = NEW.company_id)
      OR (NEW.company_id IS NULL AND c.owner_user_id = (SELECT s.user_id FROM public.sowers s WHERE s.id = NEW.sower_id))
   ORDER BY c.created_at ASC LIMIT 1;

  IF v_biz IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = v_biz AND c.books_enabled) THEN RETURN NEW; END IF;

  INSERT INTO public.books_items (business_id, product_id, name, description, kind, sku, unit_price, currency, source, active)
  VALUES (v_biz, NEW.id, COALESCE(NEW.title,'Untitled'), NEW.description,
          COALESCE(NEW.type,'product'), NEW.sku, COALESCE(NEW.price,0), COALESCE(v_cur,'USD'), 'marketplace',
          COALESCE(NEW.status,'active') <> 'archived')
  ON CONFLICT (business_id, product_id) WHERE product_id IS NOT NULL
  DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, kind = EXCLUDED.kind,
                sku = EXCLUDED.sku, unit_price = EXCLUDED.unit_price, active = EXCLUDED.active,
                updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_books_sync_product_item ON public.products;
CREATE TRIGGER trg_books_sync_product_item
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.books_sync_product_item();

-- 8. Sale income + platform fee expense from completed product bestowals
CREATE OR REPLACE FUNCTION public.books_sync_product_sale()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_biz uuid; v_cur text; v_item uuid; v_title text; v_income uuid; v_net numeric;
BEGIN
  IF NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;

  SELECT c.id, c.currency INTO v_biz, v_cur
    FROM public.products p
    JOIN public.companies c
      ON (p.company_id IS NOT NULL AND c.id = p.company_id)
      OR (p.company_id IS NULL AND c.owner_user_id = (SELECT s.user_id FROM public.sowers s WHERE s.id = p.sower_id))
   WHERE p.id = NEW.product_id
   ORDER BY c.created_at ASC LIMIT 1;

  IF v_biz IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = v_biz AND c.books_enabled) THEN RETURN NEW; END IF;

  SELECT id INTO v_item FROM public.books_items WHERE business_id = v_biz AND product_id = NEW.product_id;
  SELECT title INTO v_title FROM public.products WHERE id = NEW.product_id;
  v_net := COALESCE(NEW.sower_amount, COALESCE(NEW.amount,0) - COALESCE(NEW.s2g_fee,0));

  INSERT INTO public.books_income (
    business_id, income_type, item_id, description, amount, platform_fee, currency,
    payment_method, buyer_reference, source_table, source_id, occurred_at
  ) VALUES (
    v_biz, 'sale', v_item, COALESCE(v_title,'Marketplace sale'),
    COALESCE(NEW.amount,0), COALESCE(NEW.s2g_fee,0), COALESCE(v_cur,'USD'),
    NEW.payment_method, COALESCE(NEW.payment_reference, NEW.bestower_id::text),
    'product_bestowals', NEW.id, COALESCE(NEW.created_at, now())
  )
  ON CONFLICT (source_table, source_id) DO NOTHING
  RETURNING id INTO v_income;

  IF v_income IS NOT NULL AND COALESCE(NEW.s2g_fee,0) > 0 THEN
    INSERT INTO public.expenses (
      business_id, description, amount, currency, category, merchant, spent_on, source,
      source_table, source_id, linked_income_id
    ) VALUES (
      v_biz, 'Sow2Grow platform fee — ' || COALESCE(v_title,'sale'),
      NEW.s2g_fee, COALESCE(v_cur,'USD'), 'Platform fees', 'Sow2Grow',
      COALESCE(NEW.created_at, now())::date, 'marketplace',
      'product_bestowals_fee', NEW.id, v_income
    ) ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_books_sync_product_sale ON public.product_bestowals;
CREATE TRIGGER trg_books_sync_product_sale
AFTER INSERT OR UPDATE ON public.product_bestowals
FOR EACH ROW EXECUTE FUNCTION public.books_sync_product_sale();

-- 9. Gift income from completed orchard bestowals
CREATE OR REPLACE FUNCTION public.books_sync_gift()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_biz uuid; v_cur text;
BEGIN
  IF NEW.payment_status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;
  IF NEW.orchard_id IS NULL THEN RETURN NEW; END IF;

  SELECT user_id INTO v_owner FROM public.orchards WHERE id = NEW.orchard_id;
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  SELECT c.id, c.currency INTO v_biz, v_cur
    FROM public.companies c
   WHERE c.owner_user_id = v_owner AND c.books_enabled = true
   ORDER BY c.created_at ASC LIMIT 1;
  IF v_biz IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.books_income (
    business_id, income_type, description, amount, platform_fee, currency,
    payment_method, buyer_reference, source_table, source_id, occurred_at
  ) VALUES (
    v_biz, 'gift', 'Free-will bestowal received',
    COALESCE(NEW.amount,0), 0, COALESCE(NEW.currency, v_cur, 'USD'),
    NEW.payment_method, COALESCE(NEW.payment_reference, NEW.bestower_id::text),
    'bestowals', NEW.id, COALESCE(NEW.created_at, now())
  ) ON CONFLICT (source_table, source_id) DO NOTHING;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_books_sync_gift ON public.bestowals;
CREATE TRIGGER trg_books_sync_gift
AFTER INSERT OR UPDATE ON public.bestowals
FOR EACH ROW EXECUTE FUNCTION public.books_sync_gift();
