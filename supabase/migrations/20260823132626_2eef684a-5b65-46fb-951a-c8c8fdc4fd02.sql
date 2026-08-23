CREATE UNIQUE INDEX IF NOT EXISTS expenses_source_unique
  ON public.expenses (source_table, source_id)
  WHERE source_table IS NOT NULL AND source_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.books_sync_product_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_biz uuid; v_cur text; v_item uuid; v_title text; v_income uuid; v_pct numeric; v_whisper numeric;
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
  SELECT title, COALESCE(whisperer_commission_percent, 0) INTO v_title, v_pct
    FROM public.products WHERE id = NEW.product_id;

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

  IF v_income IS NULL THEN RETURN NEW; END IF;

  -- 1. Platform fee — always its own line
  IF COALESCE(NEW.s2g_fee,0) > 0 THEN
    INSERT INTO public.expenses (
      business_id, description, amount, currency, category, merchant, spent_on, source,
      source_table, source_id, linked_income_id
    ) VALUES (
      v_biz, 'Sow2Grow platform fee — ' || COALESCE(v_title,'sale'),
      NEW.s2g_fee, COALESCE(v_cur,'USD'), 'Platform fees', 'Sow2Grow',
      COALESCE(NEW.created_at, now())::date, 'marketplace',
      'product_bestowals_fee', NEW.id, v_income
    ) ON CONFLICT (source_table, source_id) DO NOTHING;
  END IF;

  -- 2. Whisperer commission — only when a whisperer was actually credited on this sale
  IF NEW.whisperer_id IS NOT NULL THEN
    v_whisper := COALESCE(NEW.whisperer_amount, ROUND(COALESCE(NEW.amount,0) * v_pct / 100.0, 2));
    IF COALESCE(v_whisper,0) > 0 THEN
      INSERT INTO public.expenses (
        business_id, description, amount, currency, category, merchant, spent_on, source,
        source_table, source_id, linked_income_id
      ) VALUES (
        v_biz,
        'Whisperer commission (' || TRIM(TO_CHAR(v_pct,'FM9990.99')) || '%) — ' || COALESCE(v_title,'sale'),
        v_whisper, COALESCE(v_cur,'USD'), 'Whisperer commission', 'Whisperer',
        COALESCE(NEW.created_at, now())::date, 'marketplace',
        'product_bestowals_whisperer', NEW.id, v_income
      ) ON CONFLICT (source_table, source_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END; $function$;