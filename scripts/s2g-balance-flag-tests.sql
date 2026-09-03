-- Tests credit_earning_for_bestowal()'s s2g_balance_enabled gate under
-- both flag states. Wrapped in BEGIN/ROLLBACK -- nothing here is meant to
-- persist; run the whole file in one session (`supabase db query -f`) and
-- read the final SELECT. Both rows must say pass=true.
--
-- Real, existing FK values reused as fixtures (not created/deleted by this
-- script): sower_id/product_id/bestower_id below are live rows -- this
-- script inserts its own throwaway product_bestowals row referencing them,
-- and never touches the real rows themselves.
BEGIN;

CREATE TEMP TABLE test_results (name text, pass boolean, detail text) ON COMMIT DROP;

DO $$
DECLARE
  v_sower_id uuid := '9ccd3c67-4ece-4457-a9b7-565bad7ccde1'; -- Amber Wheeles (real sower)
  v_product_id uuid := '5e85b7c2-32f3-431e-85b9-5f57c9f5d73c'; -- real product
  v_bestower_id uuid := '04754d57-d41d-4ea7-93df-542047a6785b'; -- real buyer
  v_bestowal_id uuid;
  v_status text;
  v_ledger_count int;
  v_original_flag jsonb;
BEGIN
  SELECT value INTO v_original_flag FROM public.app_settings WHERE key = 's2g_balance_enabled';

  -- ── Case 1: flag OFF -- must stay 'pending', no ledger row ──
  UPDATE public.app_settings SET value = 'false'::jsonb WHERE key = 's2g_balance_enabled';

  INSERT INTO public.product_bestowals (
    bestower_id, product_id, sower_id, amount, s2g_fee, sower_amount, grower_amount,
    status, payment_method, delivery_type, release_status, released_at, payout_status
  ) VALUES (
    v_bestower_id, v_product_id, v_sower_id, 2.30, 0.30, 2.00, 0,
    'completed', 'test', 'digital', 'released', now(), 'pending'
  ) RETURNING id INTO v_bestowal_id;

  PERFORM public.credit_earning_for_bestowal(v_bestowal_id, v_bestower_id, 'system');

  SELECT payout_status INTO v_status FROM public.product_bestowals WHERE id = v_bestowal_id;
  SELECT count(*) INTO v_ledger_count FROM public.balance_ledger WHERE reference_id = v_bestowal_id;

  INSERT INTO test_results VALUES (
    'flag OFF -> stays pending, no ledger row',
    v_status = 'pending' AND v_ledger_count = 0,
    format('status=%s ledger_rows=%s', v_status, v_ledger_count)
  );

  -- ── Case 2: flag ON -- must flip to credited_to_balance, one ledger row ──
  UPDATE public.app_settings SET value = 'true'::jsonb WHERE key = 's2g_balance_enabled';
  UPDATE public.product_bestowals SET payout_status = 'pending' WHERE id = v_bestowal_id; -- reset from case 1

  PERFORM public.credit_earning_for_bestowal(v_bestowal_id, v_bestower_id, 'system');

  SELECT payout_status INTO v_status FROM public.product_bestowals WHERE id = v_bestowal_id;
  SELECT count(*) INTO v_ledger_count FROM public.balance_ledger WHERE reference_id = v_bestowal_id;

  INSERT INTO test_results VALUES (
    'flag ON -> credited_to_balance, one ledger row',
    v_status = 'credited_to_balance' AND v_ledger_count = 1,
    format('status=%s ledger_rows=%s', v_status, v_ledger_count)
  );

  -- Restore the flag to what it actually was before this script ran, in
  -- case ROLLBACK below is ever changed to COMMIT by mistake.
  UPDATE public.app_settings SET value = v_original_flag WHERE key = 's2g_balance_enabled';
END $$;

SELECT * FROM test_results;

ROLLBACK;
