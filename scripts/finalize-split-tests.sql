-- Tests finalize_basket_order's fee split against the base-on-top model.
-- BEGIN/ROLLBACK -- leaves no trace. Run via `supabase db query -f` (or the
-- SQL editor); both rows must show pass=true. Against the pre-2026-09-04
-- definition this FAILS (fee 15% deducted from line_total: 0.35/1.95 and
-- 2.07/11.73) -- that red run is the bug demonstration; after migration
-- 20260904180000 it must be green (0.30/2.00 and 1.80/12.00).
BEGIN;

CREATE TEMP TABLE finalize_split_results (name text, pass boolean, detail text) ON COMMIT DROP;

DO $$
DECLARE
  v_buyer uuid := '04754d57-d41d-4ea7-93df-542047a6785b';   -- real user (fixture FK only)
  v_product uuid := 'c09dd521-97c3-4fe4-a6a1-ed2d852158f5'; -- real digital music seed
  v_sower uuid := '287e1afa-2bb0-4f4f-b6e7-49d5920c0866';
  v_order_id uuid;
  v_pb record;
  base numeric; total numeric;
BEGIN
  FOREACH base IN ARRAY ARRAY[2.00, 12.00] LOOP
    total := round(base * 1.15, 2);
    INSERT INTO public.basket_orders (user_id, provider, status, subtotal, processor_fee, buyer_total, items)
    VALUES (v_buyer, 'solana', 'pending', total, 0.01, round(total + 0.01, 2),
      jsonb_build_array(jsonb_build_object(
        'qty', 1, 'title', 'finalize-split test', 'ref_code', null, 'sower_id', v_sower,
        'line_total', total, 'product_id', v_product, 'unit_price', base,
        'fee_inclusive', true, 'attribution_source', 'ref_click')))
    RETURNING id INTO v_order_id;

    PERFORM public.finalize_basket_order(v_order_id);

    SELECT pb.* INTO v_pb
      FROM public.basket_order_bestowals bob
      JOIN public.product_bestowals pb ON pb.id = bob.bestowal_id
     WHERE bob.basket_order_id = v_order_id;

    INSERT INTO finalize_split_results VALUES (
      format('base %s -> sower %s / fee %s', base, base, round(total - base, 2)),
      v_pb.sower_amount = base AND v_pb.s2g_fee = round(total - base, 2),
      format('got sower=%s fee=%s amount=%s', v_pb.sower_amount, v_pb.s2g_fee, v_pb.amount)
    );
  END LOOP;
END $$;

SELECT * FROM finalize_split_results;

ROLLBACK;
