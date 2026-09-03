-- Non-custodial model switch, decided with legal 2026-09-03 (see
-- spec-payments.md). S2G Balance (topping up, paying from a balance,
-- on-demand withdrawal) is feature-flagged off client/server-side via
-- S2G_BALANCE_ENABLED -- this migration is the matching DB-side switch:
-- credit_earning_for_bestowal is the ONE function both digital-seed
-- (finalize_basket_order) and physical-seed (escrow_release_bestowal)
-- releases call to move a sower's/whisperer's earning into balance_ledger.
-- With it gated off, a released earning simply stays payout_status=
-- 'pending' -- exactly the pre-S2G-Balance behavior -- so
-- owed_payout_balances() (payout-earnings' source of truth) sees it and
-- pays it out normally instead of it disappearing into a ledger behind a
-- hidden wallet page.
--
-- Tables, RPCs, and every other S2G Balance code path are left completely
-- intact -- this is the only behavioral change, and it's a single flag
-- flip (in app_settings) to reverse.
INSERT INTO public.app_settings (key, value)
VALUES ('s2g_balance_enabled', to_jsonb(false))
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

CREATE OR REPLACE FUNCTION public.credit_earning_for_bestowal(
  _bestowal_id uuid, _actor_id uuid, _actor_role text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pb public.product_bestowals%ROWTYPE;
  v_sower_user_id uuid;
  v_we record;
  v_whisperer_user_id uuid;
  v_enabled boolean;
BEGIN
  SELECT (value = 'true'::jsonb) INTO v_enabled
    FROM public.app_settings WHERE key = 's2g_balance_enabled';
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN; -- non-custodial model: leave payout_status/status = 'pending'/'payable' for owed_payout_balances()
  END IF;

  SELECT * INTO v_pb FROM public.product_bestowals WHERE id = _bestowal_id FOR UPDATE;
  IF NOT FOUND OR v_pb.payout_status IS DISTINCT FROM 'pending' THEN
    RETURN; -- already credited (or paid via the old rail) -- never double-credit
  END IF;

  SELECT user_id INTO v_sower_user_id FROM public.sowers WHERE id = v_pb.sower_id;
  IF v_sower_user_id IS NOT NULL AND v_pb.sower_amount > 0 THEN
    PERFORM public.credit_balance_ledger(
      v_sower_user_id, v_pb.sower_amount, 'earning_credit',
      'product_bestowals', _bestowal_id, _bestowal_id::text, _actor_id,
      'bestowal earning released'
    );
  END IF;

  UPDATE public.product_bestowals
     SET payout_status = 'credited_to_balance'
   WHERE id = _bestowal_id AND payout_status = 'pending';

  FOR v_we IN
    SELECT * FROM public.whisperer_earnings
     WHERE bestowal_id = _bestowal_id AND status = 'payable'
  LOOP
    SELECT user_id INTO v_whisperer_user_id FROM public.whisperers WHERE id = v_we.whisperer_id;
    IF v_whisperer_user_id IS NOT NULL AND v_we.amount > 0 THEN
      PERFORM public.credit_balance_ledger(
        v_whisperer_user_id, v_we.amount, 'earning_credit',
        'whisperer_earnings', v_we.id, v_we.id::text, _actor_id,
        'whisperer commission released'
      );
    END IF;
    UPDATE public.whisperer_earnings SET status = 'credited_to_balance' WHERE id = v_we.id;
  END LOOP;
END;
$$;
